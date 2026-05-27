import { createFileRoute } from "@tanstack/react-router";

import { applyTtsGuards } from "@/lib/server/tts-guard";
import { getWorkerEnv } from "@/lib/server/worker-env";

// Server-side TTS endpoint — proxies to a protected, self-hosted
// OpenAI-compatible Kokoro TTS service. Secrets stay on the server.
//
// Contract:
//   GET  /api/tts -> { configured: boolean, provider: string }
//   POST /api/tts -> binary audio/mpeg (or audio/wav)
//                   or JSON 4xx/5xx { error, configured }
//
// When KOKORO_TTS_API_KEY is missing the endpoint returns a controlled
// 503 fallback signal so the frontend can fall back to the browser
// SpeechSynthesis provider without crashing.

type TTSRequestBody = {
  text?: unknown;
  accent?: unknown;
  speed?: unknown;
  voiceId?: unknown;
  type?: unknown;
};

type Accent = "british" | "american";
type Speed = "slow" | "normal" | "fast";
type RequestType = "verb_forms" | "sentence" | "group_sequence";

const ALLOWED_ACCENTS = new Set<Accent>(["british", "american"]);
const ALLOWED_SPEEDS = new Set<Speed>(["slow", "normal", "fast"]);
const ALLOWED_TYPES = new Set<RequestType>(["verb_forms", "sentence", "group_sequence"]);

const DEFAULT_ENDPOINT = "https://api.snafstudio.ru/v1/audio/speech";
const DEFAULT_BRITISH_VOICE = "bf_emma";
const DEFAULT_AMERICAN_VOICE = "af_sky";

const DEFAULT_OUTPUT_FORMAT = "mp3";
const MAX_TEXT_LENGTH = 500;

const SPEED_VALUES: Record<Speed, number> = {
  slow: 0.58,
  normal: 0.72,
  fast: 0.9,
};

const TYPE_SPEED_MULTIPLIER: Record<RequestType, number> = {
  verb_forms: 0.9,
  group_sequence: 0.85,
  sentence: 1.0,
};

const SPEED_MIN = 0.5;
const SPEED_MAX = 1.0;

export function getKokoroSpeed(speed: Speed, type: RequestType): number {
  const base = SPEED_VALUES[speed];
  const mult = TYPE_SPEED_MULTIPLIER[type];
  const value = base * mult;
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, Number(value.toFixed(3))));
}

function env(name: string, legacy?: string): string | undefined {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (legacy) {
    const l = process.env[legacy];
    if (l && l.length > 0) return l;
  }
  return undefined;
}

function endpointUrl(): string {
  return env("KOKORO_TTS_ENDPOINT", "EXTERNAL_TTS_ENDPOINT") || DEFAULT_ENDPOINT;
}

function apiKey(): string | undefined {
  return env("KOKORO_TTS_API_KEY", "EXTERNAL_TTS_API_KEY");
}

function outputFormat(): string {
  return env("KOKORO_TTS_OUTPUT_FORMAT", "EXTERNAL_TTS_OUTPUT_FORMAT") || DEFAULT_OUTPUT_FORMAT;
}

// Allowed Kokoro voice IDs exposed for diagnostics. Any value outside this
// set is ignored to keep the public surface predictable.
const ALLOWED_KOKORO_VOICES = new Set<string>([
  // American English — Female
  "af_heart",
  "af_sky",
  "af_bella",
  "af_nicole",
  "af_sarah",
  "af_aoede",
  "af_jessica",
  "af_nova",
  // American English — Male
  "am_adam",
  "am_michael",
  "am_eric",
  "am_liam",
  // British English — Female
  "bf_emma",
  "bf_alice",
  "bf_lily",
  // British English — Male
  "bm_daniel",
  "bm_fable",
  "bm_george",
  "bm_lewis",
]);

const SAFE_DEFAULT_BRITISH = "bf_emma";
const SAFE_DEFAULT_AMERICAN = "af_sky";

function voiceForAccent(accent: Accent): string {
  const envVoice =
    accent === "british"
      ? env("KOKORO_TTS_BRITISH_VOICE", "EXTERNAL_TTS_BRITISH_VOICE") || DEFAULT_BRITISH_VOICE
      : env("KOKORO_TTS_AMERICAN_VOICE", "EXTERNAL_TTS_AMERICAN_VOICE") || DEFAULT_AMERICAN_VOICE;

  if (ALLOWED_KOKORO_VOICES.has(envVoice)) return envVoice;

  const safe = accent === "british" ? SAFE_DEFAULT_BRITISH : SAFE_DEFAULT_AMERICAN;
  console.warn(
    `Configured Kokoro voice is not in allowlist; using safe default. accent=${accent} fallback=${safe}`,
  );
  return safe;
}

type ResolveVoiceResult = { ok: true; voice: string } | { ok: false; response: Response };

function resolveVoiceOrError(accent: Accent, requestedVoiceId: string): ResolveVoiceResult {
  if (requestedVoiceId) {
    if (ALLOWED_KOKORO_VOICES.has(requestedVoiceId)) {
      return { ok: true, voice: requestedVoiceId };
    }
    return {
      ok: false,
      response: json(
        {
          error: "Этот голос недоступен на сервере. Выберите другой голос.",
          code: "voice_unavailable",
          voiceId: requestedVoiceId,
          configured: true,
          provider: "kokoro",
        },
        422,
      ),
    };
  }
  return { ok: true, voice: voiceForAccent(accent) };
}

function configured(): boolean {
  return Boolean(apiKey());
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // JSON responses (probe + errors) must never be cached at shared
      // caches — they encode per-origin guard decisions.
      "Cache-Control": "private, no-store",
      Vary: "Origin",
    },
  });
}

/**
 * Split a verb-forms string by em dash, en dash, hyphen surrounded by
 * spaces, or runs of whitespace. Joins forms with ". " for clear pauses.
 */
export function prepareVerbFormsForSpeech(text: string): string {
  const parts = text
    .split(/\s*[—–]\s*|\s+-\s+|\s{2,}/u)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  return `${parts.join(". ")}.`;
}

/**
 * Prepare text for natural TTS pronunciation. Avoids reading dashes
 * aloud and inserts clear pauses for shadowing.
 */
export function prepareTtsInput(text: string, type: RequestType): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (type === "sentence") return trimmed;

  if (type === "verb_forms") {
    return prepareVerbFormsForSpeech(trimmed);
  }

  // group_sequence: multiple triples separated by lines / dots / semicolons.
  const lines = trimmed
    .split(/[\n\r;]+|\.\s+/u)
    .map((l) => l.trim())
    .filter(Boolean);
  const formatted = lines
    .map((line) => prepareVerbFormsForSpeech(line).replace(/\.$/, ""))
    .filter(Boolean);
  return `${formatted.join(". ")}.`;
}

type KokoroCallResult =
  | { ok: true; audio: ArrayBuffer; contentType: string; cache: string | null }
  | { ok: false; status: number; message: string; nonAudio?: boolean };

async function callKokoro(
  input: string,
  voice: string,
  format: string,
  speed: number,
  includeSpeed: boolean,
): Promise<KokoroCallResult> {
  const url = endpointUrl();
  const key = apiKey()!;

  const payload: Record<string, unknown> = {
    model: "kokoro",
    input,
    voice,
    response_format: format,
  };
  if (includeSpeed) payload.speed = speed;

  let res: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("TimeoutError", "TimeoutError"));
  }, 5000);

  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: format === "mp3" ? "audio/mpeg" : "audio/*",
        Authorization: `Bearer ${key}`,
        "User-Agent": "irregular-verbs-trainer",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" ||
        err.message.toLowerCase().includes("abort") ||
        err.message.toLowerCase().includes("timeout"));
    return {
      ok: false,
      status: isTimeout ? 504 : 0,
      message: isTimeout
        ? "Kokoro TTS service timeout"
        : err instanceof Error
          ? err.message
          : "Network error",
    };
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, message: text || res.statusText };
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("audio/")) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      status: 502,
      message: `Non-audio response: ${contentType} ${text.slice(0, 200)}`,
      nonAudio: true,
    };
  }

  const cache = res.headers.get("x-tts-cache");
  const audio = await res.arrayBuffer();
  return { ok: true, audio, contentType, cache };
}

function fallbackMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "Качественная озвучка недоступна: неверный ключ API. Используется голос браузера.";
  }
  if (status === 405) {
    return "Качественная озвучка недоступна: неверный метод запроса. Используется голос браузера.";
  }
  if (status === 413) {
    return "Текст слишком длинный для качественной озвучки. Используется голос браузера.";
  }
  if (status === 429 || status === 503) {
    return "Качественная озвучка временно недоступна. Используется голос браузера.";
  }
  if (status === 504) {
    return "Сервер озвучки не ответил вовремя. Используется голос браузера.";
  }
  return "Не удалось получить качественную озвучку. Используется голос браузера.";
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const env = getWorkerEnv();
        const url = new URL(request.url);
        const text = (url.searchParams.get("text") || "").trim();

        // The probe call (no 'text') is cheap (no upstream fetch) and must
        // stay available so the frontend can decide which provider to use.
        // We still enforce Origin so it cannot be used as a public probe
        // by other sites — abuse is metered by the synth path below.
        const probeGuard = await applyTtsGuards(request, env);
        if (!probeGuard.ok && probeGuard.status === 403 && !text) {
          // Quietly degrade for cross-origin probes — pretend "not
          // configured" rather than expose internal state.
          return json({ configured: false, provider: "none" }, 200);
        }

        // If no 'text' query parameter is specified, treat as a config probe request
        if (!text) {
          return json({
            configured: configured(),
            provider: configured() ? "kokoro" : "none",
          });
        }

        // For real synthesis requests, enforce both Origin and rate-limit.
        if (!probeGuard.ok) {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (probeGuard.retryAfter != null) {
            headers["Retry-After"] = String(probeGuard.retryAfter);
          }
          return new Response(JSON.stringify({ error: probeGuard.message }), {
            status: probeGuard.status,
            headers,
          });
        }

        const accent = url.searchParams.get("accent") || "";
        const speed = url.searchParams.get("speed") || "";
        const type = url.searchParams.get("type") || "";
        const requestedVoice = (url.searchParams.get("voiceId") || "").trim();

        if (text.length > MAX_TEXT_LENGTH) {
          return json({ error: `Field 'text' must be ≤ ${MAX_TEXT_LENGTH} chars.` }, 400);
        }
        if (!ALLOWED_ACCENTS.has(accent as Accent)) {
          return json({ error: "Invalid 'accent'." }, 400);
        }
        if (!ALLOWED_SPEEDS.has(speed as Speed)) {
          return json({ error: "Invalid 'speed'." }, 400);
        }
        if (!ALLOWED_TYPES.has(type as RequestType)) {
          return json({ error: "Invalid 'type'." }, 400);
        }

        if (!configured()) {
          return json(
            {
              error: "Server TTS is not configured.",
              configured: false,
              provider: "none",
            },
            503,
          );
        }

        const input = prepareTtsInput(text, type as RequestType);
        const resolved = resolveVoiceOrError(accent as Accent, requestedVoice);
        if (!resolved.ok) return resolved.response;
        const voice = resolved.voice;
        const format = outputFormat();
        const speedValue = getKokoroSpeed(speed as Speed, type as RequestType);
        const started = Date.now();

        let result = await callKokoro(input, voice, format, speedValue, true);

        // Retry without speed if Kokoro rejected it (400 family).
        if (!result.ok && (result.status === 400 || result.status === 422) && speedValue !== 1.0) {
          console.warn(
            `Kokoro rejected speed=${speedValue} (status ${result.status}); retrying without speed.`,
          );
          result = await callKokoro(input, voice, format, speedValue, false);
        }

        if (!result.ok) {
          console.error(`Kokoro TTS failed: status=${result.status} message=${result.message}`);
          const voiceInvalid =
            (result.status === 400 || result.status === 422) && /voice/i.test(result.message);
          if (voiceInvalid) {
            return json(
              {
                error: "Этот голос недоступен на сервере. Выберите другой голос.",
                code: "voice_unavailable",
                voiceId: voice,
                configured: true,
                provider: "kokoro",
              },
              422,
            );
          }
          return json(
            {
              error: fallbackMessage(result.status),
              configured: true,
              provider: "kokoro",
            },
            502,
          );
        }

        const cacheStatus = (result.cache || "MISS").toUpperCase();
        const durationMs = Date.now() - started;
        console.log(
          `[tts] provider=kokoro cache=${cacheStatus} voice=${voice} type=${type} accent=${accent} speed=${speed} duration_ms=${durationMs}`,
        );

        return new Response(result.audio, {
          status: 200,
          headers: {
            "Content-Type": result.contentType,
            // private (not public): browsers cache for a year, but Vercel
            // edge / shared CDNs MUST NOT cache the response — that would
            // bypass our Origin guard on subsequent requests for the same
            // URL. The upstream Kokoro cache-proxy already deduplicates
            // on the server, so we don't lose performance.
            "Cache-Control": "private, max-age=31536000, immutable",
            // Belt-and-suspenders: if any intermediate cache ignores the
            // private directive (some misbehave), key the entry on Origin
            // so cross-origin replays still miss.
            Vary: "Origin",
            "X-TTS-Provider": "kokoro",
            "X-TTS-Voice": voice,
            "X-TTS-Cache": cacheStatus,
            "X-TTS-Duration-Ms": String(durationMs),
            "Access-Control-Expose-Headers":
              "X-TTS-Provider, X-TTS-Voice, X-TTS-Cache, X-TTS-Duration-Ms, Content-Type, Content-Length",
          },
        });
      },
    },
  },
});
