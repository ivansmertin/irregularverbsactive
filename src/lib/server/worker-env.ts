// Request-env bridge + rate-limit backend wiring.
//
// On Cloudflare Workers, the runtime passes `env` (containing KV/secret
// bindings) to the fetch handler. We stash it on a module-level slot so
// file routes can read it later.
//
// On Vercel (Node serverless) there is no `env` parameter — bindings come
// from process.env. The fallback path in getWorkerEnv() handles that.
//
// We also opportunistically register a rate-limit backend (Upstash) if
// the env exposes one. Registration is idempotent and cheap.

import { createUpstashRateLimiterFromEnv } from "./rate-limit-upstash";
import { setRateLimiter, type Env } from "./tts-guard";

let workerEnv: Env | undefined;
let backendRegistered = false;

function registerBackendOnce(envObj: Record<string, string | undefined>): void {
  if (backendRegistered) return;
  backendRegistered = true;
  const upstash = createUpstashRateLimiterFromEnv(envObj);
  if (upstash) {
    setRateLimiter(upstash);
  }
}

export function setWorkerEnv(env: unknown): void {
  if (env && typeof env === "object") {
    workerEnv = env as Env;
    registerBackendOnce(env as Record<string, string | undefined>);
  }
}

export function getWorkerEnv(): Env {
  // Fall back to process.env for Vercel and local dev so callers always
  // get a readable object. Also kick the Upstash registration on the
  // first read — handles the Vercel cold-start path where setWorkerEnv
  // was never called (no env arg in the serverless handler signature).
  if (!workerEnv) {
    const proc =
      typeof process !== "undefined" && process.env ? (process.env as unknown as Env) : ({} as Env);
    registerBackendOnce(proc as Record<string, string | undefined>);
    return proc;
  }
  return workerEnv;
}
