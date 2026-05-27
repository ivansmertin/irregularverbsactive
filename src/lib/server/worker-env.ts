// Tiny request-env bridge.
//
// TanStack Start file routes don't get the Cloudflare Worker env handed to
// them directly. We stash it on a module-level slot in server.ts (which is
// the Worker's fetch entry point) so handlers can read it later.
//
// Safety: env is per-isolate and stable for the Worker's lifetime, so a
// single set on cold start is enough. We never mutate the object.

import type { Env } from "./tts-guard";

let workerEnv: Env | undefined;

export function setWorkerEnv(env: unknown): void {
  if (env && typeof env === "object") {
    workerEnv = env as Env;
  }
}

export function getWorkerEnv(): Env {
  // Fall back to process.env for local dev and unit tests so callers
  // always get a readable object — KV binding will just be undefined and
  // the rate limiter will degrade to a no-op (see tts-guard).
  if (!workerEnv) {
    const proc =
      typeof process !== "undefined" && process.env ? (process.env as unknown as Env) : ({} as Env);
    return proc;
  }
  return workerEnv;
}
