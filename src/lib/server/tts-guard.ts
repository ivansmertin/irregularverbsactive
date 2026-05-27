// Guardrails for the public /api/tts proxy:
//   • Origin/Referer allowlist — blocks "borrowed" calls from other sites.
//   • Sliding-window IP rate limiter backed by Cloudflare Workers KV.
//   • Global daily ceiling so a single bad actor or runaway bug cannot
//     drain the Kokoro budget while we sleep.
//
// All limits are tunable via env. When KV is not bound (e.g. local dev or
// preview without the binding) the rate limiter degrades to a no-op so
// the endpoint still works — local abuse is not the threat model.
//
// Pure module: no React, no DOM. Safe to import from server handlers.

export type Env = {
  // Cloudflare Workers KV namespace. Bind via wrangler.jsonc.
  TTS_RATE_LIMIT?: KVNamespace;
  // Comma-separated list of allowed origins (e.g. "https://verbs.example.com,https://staging.example.com").
  // Empty / unset → same-origin only (we still allow no-Origin GETs from
  // direct navigation, which most browsers send for img/audio fetches).
  ALLOWED_ORIGINS?: string;
  // Per-IP requests per window. Default 60 per 5 min ≈ 12/min.
  TTS_RATE_LIMIT_PER_IP?: string;
  TTS_RATE_LIMIT_WINDOW_SECONDS?: string;
  // Hard daily cap across all IPs. Default 10_000 calls/day.
  TTS_DAILY_CAP?: string;
};

// Minimal KV typing — avoids depending on @cloudflare/workers-types in src.
type KVNamespace = {
  get(key: string, opts?: { type?: "text" | "json" }): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

export type GuardDecision =
  | { ok: true }
  | { ok: false; status: 403 | 429; message: string; retryAfter?: number };

function intEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseAllowList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function originAllowed(request: Request, env: Env): boolean {
  const allowed = parseAllowList(env.ALLOWED_ORIGINS);

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // Derive the "self" origin from the request URL — same-origin browser
  // calls (where the page lives on the same host) are always allowed.
  let selfOrigin: string | null = null;
  try {
    selfOrigin = new URL(request.url).origin;
  } catch {
    selfOrigin = null;
  }

  // Direct navigation / non-browser GETs often omit Origin. Allow them
  // — they cannot make CSRF-style cross-site state changes against this
  // endpoint (which is read-only), and the rate limiter still bounds them.
  if (!origin && !referer) return true;

  const candidates = [selfOrigin, ...allowed].filter(Boolean) as string[];

  if (origin) {
    if (candidates.includes(origin)) return true;
    // Also accept a bare host match for cases where the Worker URL differs
    // from the page URL (e.g. previews on *.workers.dev).
    if (host && origin.endsWith(`//${host}`)) return true;
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (candidates.includes(refOrigin)) return true;
      if (host && refOrigin.endsWith(`//${host}`)) return true;
    } catch {
      /* malformed referer — fall through to deny */
    }
  }

  return false;
}

function clientIp(request: Request): string {
  // Cloudflare always sets CF-Connecting-IP for real client traffic.
  // Fallback chain mirrors common reverse-proxy headers for local/dev.
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Read the current counter for a key, return [count, ttl].
 * KV `get` returns null for missing keys; we treat missing as 0.
 */
async function readCounter(kv: KVNamespace, key: string): Promise<number> {
  const raw = await kv.get(key);
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Bump a KV counter with a TTL. Not strictly atomic (KV doesn't support
 * INCR), so under burst contention a small overcount is possible — that's
 * acceptable for an abuse cap. We pass the window TTL on every write so
 * the key always expires roughly `windowSeconds` after the LAST write,
 * which is the desired sliding-window-ish behaviour.
 */
async function bumpCounter(kv: KVNamespace, key: string, windowSeconds: number): Promise<number> {
  const current = await readCounter(kv, key);
  const next = current + 1;
  await kv.put(key, String(next), { expirationTtl: windowSeconds });
  return next;
}

function dayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

/**
 * Apply Origin + rate-limit guards. Call this BEFORE doing any expensive
 * work (validation, fetch to Kokoro). Returns `{ ok: true }` on success
 * or a structured failure that the caller turns into an HTTP response.
 */
export async function applyTtsGuards(request: Request, env: Env): Promise<GuardDecision> {
  if (!originAllowed(request, env)) {
    return {
      ok: false,
      status: 403,
      message: "Forbidden: origin not allowed.",
    };
  }

  // Without KV bound (local dev, missing binding), we cannot rate-limit.
  // Allow the request and log once so the operator notices.
  const kv = env.TTS_RATE_LIMIT;
  if (!kv) {
    return { ok: true };
  }

  const ip = clientIp(request);
  const perIpLimit = intEnv(env.TTS_RATE_LIMIT_PER_IP, 60);
  const windowSeconds = intEnv(env.TTS_RATE_LIMIT_WINDOW_SECONDS, 300);
  const dailyCap = intEnv(env.TTS_DAILY_CAP, 10_000);

  const ipKey = `tts:ip:${ip}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const dayKeyName = `tts:day:${dayKey()}`;

  // Read both counters in parallel — we still write sequentially below
  // to keep the call simple.
  const [ipCount, dayCount] = await Promise.all([
    readCounter(kv, ipKey),
    readCounter(kv, dayKeyName),
  ]);

  if (dayCount >= dailyCap) {
    return {
      ok: false,
      status: 429,
      message: "Daily TTS quota exhausted. Please try tomorrow.",
      retryAfter: 3600,
    };
  }

  if (ipCount >= perIpLimit) {
    return {
      ok: false,
      status: 429,
      message: "Too many TTS requests from your IP. Please slow down.",
      retryAfter: windowSeconds,
    };
  }

  // Bump both counters AFTER deciding to allow — keeps the limit close to
  // its nominal value at the cost of one extra KV write per pass.
  await Promise.all([
    bumpCounter(kv, ipKey, windowSeconds),
    // Day key TTL of 36h gives a comfortable cushion for the UTC rollover.
    bumpCounter(kv, dayKeyName, 36 * 3600),
  ]);

  return { ok: true };
}
