// Upstash REST rate-limit backend.
//
// Plugged in when both KV_REST_API_URL and KV_REST_API_TOKEN are set in
// the runtime env (Vercel KV / Upstash Redis populate these automatically
// when you bind a KV instance to the project).
//
// Two counters:
//   • tts:ip:<ip>:<bucket>  with TTL = windowSeconds
//   • tts:day:YYYY-MM-DD    with TTL = 36h
//
// We use Upstash REST API (HTTP) instead of the @upstash/redis SDK to
// keep this dependency-free — the SDK pulls a heavy bundle and most of
// what it does is just `fetch` to the REST endpoint anyway.

import type { RateLimiter } from "./tts-guard";

type UpstashConfig = {
  url: string;
  token: string;
};

function readConfig(env: Record<string, string | undefined>): UpstashConfig | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function call<T>(cfg: UpstashConfig, command: (string | number)[]): Promise<T | null> {
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      // Hard ceiling — never let a slow rate-limit backend stall the
      // actual TTS request. If Upstash is sick, fail open (allow).
      signal: AbortSignal.timeout(500),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: T };
    return json.result ?? null;
  } catch {
    return null;
  }
}

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

class UpstashRateLimiter implements RateLimiter {
  constructor(private cfg: UpstashConfig) {}

  async consume(opts: { ip: string; perIpLimit: number; windowSeconds: number; dailyCap: number }) {
    const { ip, perIpLimit, windowSeconds, dailyCap } = opts;
    const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
    const ipKey = `tts:ip:${ip}:${bucket}`;
    const dayKeyName = `tts:day:${dayKey()}`;

    // INCR + EXPIRE in parallel for both counters. Upstash supports
    // pipelining via the /pipeline endpoint but two parallel POSTs are
    // simpler and the fail-open semantics make extra latency cheap.
    const [ipCount, dayCount] = await Promise.all([
      call<number>(this.cfg, ["INCR", ipKey]),
      call<number>(this.cfg, ["INCR", dayKeyName]),
    ]);

    // If Upstash failed, fail open — we'd rather let traffic through than
    // black-hole the user when the rate-limit backend is down.
    if (ipCount === null || dayCount === null) return { allowed: true as const };

    // Set TTL only on first hit (count == 1) to make this a true window.
    if (ipCount === 1) {
      void call(this.cfg, ["EXPIRE", ipKey, windowSeconds]);
    }
    if (dayCount === 1) {
      void call(this.cfg, ["EXPIRE", dayKeyName, 36 * 3600]);
    }

    if (dayCount > dailyCap) {
      return { allowed: false as const, retryAfter: 3600, reason: "daily" as const };
    }
    if (ipCount > perIpLimit) {
      return { allowed: false as const, retryAfter: windowSeconds, reason: "ip" as const };
    }
    return { allowed: true as const };
  }
}

/**
 * Create a rate limiter from the current env. Returns null when Upstash
 * is not configured — caller should keep using the no-op fallback.
 */
export function createUpstashRateLimiterFromEnv(
  env: Record<string, string | undefined>,
): RateLimiter | null {
  const cfg = readConfig(env);
  if (!cfg) return null;
  return new UpstashRateLimiter(cfg);
}
