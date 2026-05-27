// Guardrails for the public /api/tts proxy.
//
// Two layers, applied in order:
//   1. Origin/Referer allowlist — blocks "borrowed" calls from other sites.
//   2. Optional per-IP rate limiter — pluggable backend (see RateLimiter
//      interface). Use Upstash Redis on Vercel, KV on Cloudflare Workers,
//      or leave unset and rely on the upstream Kokoro cache-proxy's own
//      per-IP rate-limit (30/min, set in /opt/kokoro-cache-proxy/main.py).
//
// All limits are tunable via env. When no rate-limit backend is registered
// the limiter degrades to a no-op so the endpoint still works — local dev
// abuse is not the threat model.
//
// Pure module: no React, no DOM. Safe to import from server handlers.

export type Env = {
  // Comma-separated list of allowed origins
  // (e.g. "https://verbs.example.com,https://staging.example.com").
  // Empty / unset → same-origin only (derived from the request URL).
  ALLOWED_ORIGINS?: string;
  // Per-IP requests per window.
  TTS_RATE_LIMIT_PER_IP?: string;
  TTS_RATE_LIMIT_WINDOW_SECONDS?: string;
  // Hard daily ceiling across all IPs.
  TTS_DAILY_CAP?: string;
};

export type GuardDecision =
  | { ok: true }
  | { ok: false; status: 403 | 429; message: string; retryAfter?: number };

// ----- Origin check ------------------------------------------------------

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
    // from the page URL (e.g. previews on *.vercel.app, *.workers.dev).
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

// ----- Rate-limit (pluggable backend) ------------------------------------

/**
 * Minimal interface a rate-limit backend must implement. Concrete
 * implementations live next to the runtime they target:
 *
 *   - Cloudflare Workers: a KV-backed sliding window
 *   - Vercel: an Upstash Redis-backed window (when configured)
 *   - else: noop (recommended only when the upstream service has its own
 *     per-IP rate-limit, as Kokoro cache-proxy does in our setup).
 */
export interface RateLimiter {
  /** Returns `{ allowed, retryAfter? }`. */
  consume(opts: {
    ip: string;
    perIpLimit: number;
    windowSeconds: number;
    dailyCap: number;
  }): Promise<{ allowed: true } | { allowed: false; retryAfter: number; reason: "ip" | "daily" }>;
}

let backend: RateLimiter | null = null;

/** Register a rate-limit backend. Call this at server entry-point setup. */
export function setRateLimiter(rl: RateLimiter | null): void {
  backend = rl;
}

function clientIp(request: Request): string {
  // Vercel sets x-forwarded-for and x-real-ip. Cloudflare adds cf-connecting-ip.
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function intEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ----- Public API --------------------------------------------------------

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

  if (!backend) {
    // No backend bound — rely on upstream (Kokoro cache-proxy) limits.
    return { ok: true };
  }

  const ip = clientIp(request);
  const perIpLimit = intEnv(env.TTS_RATE_LIMIT_PER_IP, 60);
  const windowSeconds = intEnv(env.TTS_RATE_LIMIT_WINDOW_SECONDS, 300);
  const dailyCap = intEnv(env.TTS_DAILY_CAP, 10_000);

  const result = await backend.consume({ ip, perIpLimit, windowSeconds, dailyCap });
  if (result.allowed) return { ok: true };
  return {
    ok: false,
    status: 429,
    message:
      result.reason === "daily"
        ? "Daily TTS quota exhausted. Please try tomorrow."
        : "Too many TTS requests from your IP. Please slow down.",
    retryAfter: result.retryAfter,
  };
}
