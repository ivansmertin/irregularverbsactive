# /api/tts — Origin-check + KV rate-limit

The TTS proxy was previously unauthenticated and unbounded — any caller
could send arbitrary text and drain the Kokoro bill. The Worker now
applies two guards before any upstream call:

1. **Origin allowlist** — same-origin always, plus any host in
   `ALLOWED_ORIGINS`. Cross-origin probes (`GET /api/tts` without text)
   get a degraded `{configured:false}` response rather than a 403, so a
   bad referrer can't fingerprint the deployment.
2. **Sliding-window rate limit** in Workers KV — per-IP and global daily
   cap. On 429 the response carries `Retry-After`.

## One-time setup

1. Create the KV namespace:

   ```sh
   wrangler kv namespace create TTS_RATE_LIMIT
   wrangler kv namespace create TTS_RATE_LIMIT --preview
   ```

   Both commands print an `id`. Paste them into `wrangler.jsonc`:

   ```jsonc
   "kv_namespaces": [
     {
       "binding": "TTS_RATE_LIMIT",
       "id": "<paste production id>",
       "preview_id": "<paste preview id>"
     }
   ]
   ```

2. Set your production origin in `wrangler.jsonc → vars.ALLOWED_ORIGINS`,
   e.g. `"https://verbs.example.com"`. Multiple comma-separated values
   are allowed.

3. Tune the limits if needed (defaults shown):

   | Var | Default | Meaning |
   |---|---|---|
   | `TTS_RATE_LIMIT_PER_IP` | `60` | requests per window per IP |
   | `TTS_RATE_LIMIT_WINDOW_SECONDS` | `300` | window length |
   | `TTS_DAILY_CAP` | `10000` | global ceiling per day (UTC) |

4. Deploy:

   ```sh
   wrangler deploy
   ```

## Operating

- All decisions log nothing on the success path — the existing
  `[tts] provider=... cache=...` log line is unchanged. Failures already
  log `Kokoro TTS failed:`.
- KV is only read/written for **synthesis** requests (text present). The
  config probe (no text) is free.
- When KV is not bound (local `vite dev`), the guard degrades to a no-op
  for rate-limit but still enforces Origin — local abuse is not the
  threat model.
- Per-IP counter key: `tts:ip:<ip>:<windowIdx>`, TTL = `windowSeconds`.
  Daily counter key: `tts:day:YYYY-MM-DD`, TTL = 36 h.

## Verifying

```sh
# Probe — always allowed from same origin:
curl -sI https://verbs.example.com/api/tts

# From a foreign origin — should degrade:
curl -sI -H 'Origin: https://evil.example.com' https://verbs.example.com/api/tts

# Synthesis attempt from foreign origin — should 403:
curl -sI -H 'Origin: https://evil.example.com' \
  'https://verbs.example.com/api/tts?text=hello&accent=british&speed=normal&type=sentence'

# Burst from same IP — after PER_IP requests should 429 with Retry-After:
for i in $(seq 1 70); do
  curl -s -o /dev/null -w '%{http_code}\n' \
    "https://verbs.example.com/api/tts?text=test$i&accent=british&speed=normal&type=sentence"
done | sort | uniq -c
```
