# /api/tts — Origin-check + (optional) rate-limit

The TTS proxy was previously unauthenticated and unbounded — any caller
could send arbitrary text and drain the Kokoro bill. We now have three
layers of protection:

1. **Origin allowlist** (always on, no infra) — same-origin always, plus
   any host in `ALLOWED_ORIGINS`. Cross-origin synthesis requests get
   403; cross-origin probes get a degraded `{configured:false}` so a bad
   referrer cannot fingerprint the deployment.

2. **Server-side per-IP rate-limit** (always on, lives on the Kokoro
   cache-proxy box at `/opt/kokoro-cache-proxy/main.py`) — 30 req/min per
   IP, returns 429 with `Retry-After`. See `tail /opt/kokoro/cache/index.jsonl`
   for THROTTLED entries.

3. **Edge per-IP rate-limit (opt-in)** — when an Upstash / Vercel KV
   instance is bound, a second sliding-window counter runs in the Vercel
   function before the request reaches the upstream. Caps daily volume
   too. **Not required** because layer 2 already covers budget, but
   recommended for production to stop traffic before it leaves Vercel.

Also: the synth response uses `Cache-Control: private, max-age=…,
immutable` + `Vary: Origin`. Vercel edge **does not** cache the response,
so the guard cannot be bypassed by replaying URLs. Browsers still cache
per-user, so repeated playback in a session is free.

## Setup

### Required env vars (Vercel Project Settings → Environment Variables)

```
KOKORO_TTS_API_KEY          (already set)
KOKORO_TTS_ENDPOINT         (already set, defaults to api.snafstudio.ru)
ALLOWED_ORIGINS             https://irregularverbsactive.vercel.app
```

`ALLOWED_ORIGINS` is comma-separated for multiple. Leave empty to allow
only the request's own origin (same-host fetches).

### Optional: Upstash rate-limit

1. Vercel dashboard → Storage → Create KV (it's Upstash Redis underneath).
2. Bind to the project. Vercel will set the following env vars
   automatically:

   ```
   KV_REST_API_URL
   KV_REST_API_TOKEN
   ```

3. Optionally tune limits via env:

   | Var | Default | Meaning |
   |---|---|---|
   | `TTS_RATE_LIMIT_PER_IP` | `60` | requests per window per IP |
   | `TTS_RATE_LIMIT_WINDOW_SECONDS` | `300` | window length |
   | `TTS_DAILY_CAP` | `10000` | global ceiling per UTC day |

4. Redeploy. The backend self-registers from `worker-env.ts` on cold
   start. If Upstash is sick, the limiter **fails open** (returns allowed)
   to avoid black-holing real users — the cache-proxy layer still bounds
   abuse in that scenario.

## Verifying

```sh
# Probe — always allowed from same origin:
curl -sI https://irregularverbsactive.vercel.app/api/tts

# From a foreign origin — should degrade probe:
curl -sI -H 'Origin: https://evil.example.com' \
  https://irregularverbsactive.vercel.app/api/tts
# Expect: 200 with body {"configured":false,"provider":"none"}

# Synthesis from foreign origin — should 403:
curl -sI -H 'Origin: https://evil.example.com' \
  'https://irregularverbsactive.vercel.app/api/tts?text=hello&accent=british&speed=normal&type=sentence'
# Expect: 403

# Burst from same IP (with Upstash bound) — eventually 429:
for i in $(seq 1 70); do
  curl -s -o /dev/null -w '%{http_code}\n' \
    "https://irregularverbsactive.vercel.app/api/tts?text=test$i&accent=british&speed=normal&type=sentence"
done | sort | uniq -c
```

## Server-side (Kokoro) layer

For reference, the cache-proxy on the Kokoro box also has:

- Per-IP rate-limit 30/min (env `RATE_LIMIT_PER_IP`, `RATE_LIMIT_WINDOW_S`)
- systemd MemoryMax=512M, CPUQuota=80%, TasksMax=200
- LRU cron eviction at 500 MB (`/usr/local/sbin/kokoro-cache-evict.sh`)
- logrotate weekly × 4 for the synthesis log

So even without Upstash, the Kokoro box itself caps abuse.
