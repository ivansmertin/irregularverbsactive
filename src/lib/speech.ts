import type { Accent, SpeechRequest, SpeechResult, SpeechSpeed } from "./types";

// SpeechProvider abstraction — supports a high-quality server TTS provider
// with a graceful fallback to the browser's built-in SpeechSynthesis API.
//
// Selection logic (see getActiveSpeechProvider):
//   1. If ServerSpeechProvider reports availability, use it.
//   2. Otherwise fall back to BrowserSpeechProvider.
//   3. If neither is available, UI shows "Голос недоступен".
//
// TODO: Wire a real TTS provider (e.g. ElevenLabs, Google Cloud TTS, Azure,
//       OpenAI TTS) behind the /api/tts endpoint. Never expose provider API
//       keys in the frontend — read them from env vars on the server only.

export interface SpeechProvider {
  name: string;
  kind: "server" | "browser";
  speak(req: SpeechRequest): Promise<SpeechResult>;
  stop(): void;
  isAvailable(): boolean;
}

export type AudioAsset = {
  id: string;
  text: string;
  textHash: string;
  accent: Accent;
  speed: SpeechSpeed;
  voiceId: string;
  /** Voice actually used by the server, from X-TTS-Voice header. */
  serverVoiceId?: string;
  type: SpeechRequest["type"];
  audioUrl: string;
  durationMs?: number;
  provider: string;
  upstreamCache?: "HIT" | "MISS";
  /** Upstream synthesis duration in ms (from X-TTS-Duration-Ms). */
  upstreamDurationMs?: number;
  contentType?: string;
  audioBytes?: number;
  createdAt: string;
};

/** Browser SpeechSynthesis rate mapping (slower than default for Shadowing). */
const browserSpeedToRate: Record<SpeechSpeed, number> = {
  slow: 0.65,
  normal: 0.8,
  fast: 0.95,
};

/**
 * Guaranteed client-side playbackRate for Kokoro MP3 audio.
 * Kokoro server-side speed may be ignored or weakly applied — clamp here.
 */
export function playbackRateForSpeed(speed: SpeechSpeed, type: SpeechRequest["type"]): number {
  const base = speed === "slow" ? 0.65 : speed === "fast" ? 0.92 : 0.78;
  const mult = type === "verb_forms" ? 0.95 : type === "group_sequence" ? 0.9 : 1.0;
  const rate = base * mult;
  return Math.min(1.0, Math.max(0.6, Number(rate.toFixed(3))));
}

/** Stable, fast non-cryptographic hash. Good enough for cache keys. */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Bump when server-side prep/speed mapping changes so old cached audio is not reused. */
export const TTS_PREP_VERSION = "kokoro-verified-playbackrate-v4";

export function cacheKey(req: SpeechRequest & { voiceId?: string }): string {
  const voice = req.voiceId ?? defaultVoiceId(req.accent);
  const normalized = req.text.replace(/\s+/g, " ").trim();
  return fnv1a([normalized, req.accent, req.speed, voice, req.type, TTS_PREP_VERSION].join("|"));
}

export function defaultVoiceId(accent: Accent): string {
  return accent === "british" ? "default-british" : "default-american";
}

/** Recommended Kokoro voices verified to exist on the server. */
export const RECOMMENDED_VOICES: Record<Accent, Record<"female" | "male", string>> = {
  american: { female: "af_sky", male: "am_adam" },
  british: { female: "bf_emma", male: "bm_lewis" },
};

export function recommendedVoiceId(accent: Accent, gender: "female" | "male"): string {
  return RECOMMENDED_VOICES[accent][gender];
}

// ---------------- Browser provider (always-available fallback) -----------

class BrowserSpeechProvider implements SpeechProvider {
  name = "browser-speech-synthesis";
  kind = "browser" as const;
  private current: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const tryLoad = () => window.speechSynthesis.getVoices();
      tryLoad();
      window.speechSynthesis.onvoiceschanged = tryLoad;
    }
  }

  isAvailable(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  private pickVoice(accent: Accent): SpeechSynthesisVoice | undefined {
    if (!this.isAvailable()) return undefined;
    const voices = window.speechSynthesis.getVoices();
    const targetLang = accent === "british" ? "en-GB" : "en-US";
    return (
      voices.find((v) => v.lang === targetLang) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith(targetLang.toLowerCase())) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith("en"))
    );
  }

  speak(req: SpeechRequest): Promise<SpeechResult> {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable()) {
        reject(new Error("В этом браузере нет голосового движка для озвучки."));
        return;
      }
      this.stop();
      const utter = new SpeechSynthesisUtterance(req.text);
      const voice = this.pickVoice(req.accent);
      if (voice) utter.voice = voice;
      utter.lang = req.accent === "british" ? "en-GB" : "en-US";
      utter.rate = browserSpeedToRate[req.speed];
      utter.pitch = 1;
      this.current = utter;

      const start = Date.now();
      utter.onend = () => {
        this.current = null;
        resolve({ provider: this.name, cached: false, durationMs: Date.now() - start });
      };
      utter.onerror = (e) => {
        this.current = null;
        if (e.error === "interrupted" || e.error === "canceled") {
          resolve({ provider: this.name, cached: false });
          return;
        }
        reject(new Error("Не удалось воспроизвести речь."));
      };
      window.speechSynthesis.speak(utter);
    });
  }

  stop(): void {
    if (this.isAvailable()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* noop */
      }
    }
    this.current = null;
  }
}

// ---------------- Server provider (high-quality TTS via /api/tts) --------

type TTSGetResponse = {
  configured?: boolean;
  provider?: string;
};

type TTSErrorResponse = {
  error?: string;
  configured?: boolean;
  provider?: string;
};

const TTS_ENDPOINT = "/api/tts";

export type SpeechState =
  | "idle"
  | "preparing"
  | "synthesizing"
  | "loading_audio"
  | "playing"
  | "cached"
  | "error"
  | "fallback";

export type SpeakOptions = {
  onState?: (state: SpeechState) => void;
  signal?: AbortSignal;
  /** When true, do not fall back to the browser SpeechSynthesis on server failure. */
  noFallback?: boolean;
};

// Negative probe results expire after this window so a transient network
// blip during the first probe doesn't disable Kokoro for the whole tab
// session.
const PROBE_NEGATIVE_TTL_MS = 60_000;

class ServerSpeechProvider implements SpeechProvider {
  name = "server-tts";
  kind = "server" as const;
  private audio: HTMLAudioElement | null = null;
  private assetCache = new Map<string, AudioAsset>();
  private inflight = new Map<string, Promise<AudioAsset>>();
  private configured: boolean | null = null;
  private configuredAt = 0;

  constructor() {
    // Revoke any outstanding blob URLs when the tab is closing. Helps
    // browsers that don't aggressively GC blobs on navigation.
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", () => this.disposeBlobs(), { once: true });
    }
  }

  isAvailable(): boolean {
    return typeof window !== "undefined" && this.configured !== false;
  }

  /** Release every cached blob URL. Used on tab unload and by tests. */
  disposeBlobs(): void {
    for (const asset of this.assetCache.values()) {
      try {
        URL.revokeObjectURL(asset.audioUrl);
      } catch {
        /* noop */
      }
    }
    this.assetCache.clear();
  }

  async probe(): Promise<boolean> {
    // Cached probe result. Negative result has a TTL so we recover from
    // a transient hiccup (the previous code stuck on false forever).
    if (this.configured === true) return true;
    if (this.configured === false && Date.now() - this.configuredAt < PROBE_NEGATIVE_TTL_MS) {
      return false;
    }
    try {
      const res = await fetch(TTS_ENDPOINT, { method: "GET" });
      if (!res.ok) {
        this.configured = false;
        this.configuredAt = Date.now();
        return false;
      }
      const data = (await res.json()) as TTSGetResponse;
      this.configured = !!data.configured;
      this.configuredAt = Date.now();
      return this.configured;
    } catch {
      this.configured = false;
      this.configuredAt = Date.now();
      return false;
    }
  }

  hasCached(req: SpeechRequest): boolean {
    const voiceId = req.voiceId ?? defaultVoiceId(req.accent);
    return this.assetCache.has(cacheKey({ ...req, voiceId }));
  }

  /** Fetch (and cache) an audio asset without playing it. Safe to call repeatedly. */
  async ensureAsset(req: SpeechRequest, signal?: AbortSignal): Promise<AudioAsset> {
    if (typeof window === "undefined") {
      throw new Error("Server TTS can only be used in the browser.");
    }
    const voiceId = req.voiceId ?? defaultVoiceId(req.accent);
    const key = cacheKey({ ...req, voiceId });

    const cached = this.assetCache.get(key);
    if (cached) return cached;

    const existing = this.inflight.get(key);
    if (existing) return existing;

    const pending = (async () => {
      const started = typeof performance !== "undefined" ? performance.now() : Date.now();
      const params = new URLSearchParams({
        text: req.text,
        accent: req.accent,
        speed: req.speed,
        voiceId,
        type: req.type,
      });
      const res = await fetch(`${TTS_ENDPOINT}?${params.toString()}`, {
        method: "GET",
        signal,
      });

      if (!res.ok) {
        if (res.status === 503) {
          this.configured = false;
          this.configuredAt = Date.now();
        }
        let message = `Server TTS error (${res.status})`;
        try {
          const data = (await res.json()) as TTSErrorResponse;
          if (data.error) message = data.error;
        } catch {
          /* non-JSON */
        }
        throw new Error(message);
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.toLowerCase().startsWith("audio/")) {
        throw new Error("Сервер вернул неаудио ответ.");
      }
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);

      const upstreamRaw = (res.headers.get("x-tts-cache") || "").toUpperCase();
      const upstreamCache: "HIT" | "MISS" | undefined =
        upstreamRaw === "HIT" ? "HIT" : upstreamRaw === "MISS" ? "MISS" : undefined;
      const provider = res.headers.get("x-tts-provider") || "kokoro";
      const serverVoiceId = res.headers.get("x-tts-voice") || undefined;
      const durationHeader = res.headers.get("x-tts-duration-ms");
      const upstreamDurationMs = durationHeader ? Number(durationHeader) : undefined;

      const asset: AudioAsset = {
        id: key,
        text: req.text,
        textHash: key,
        accent: req.accent,
        speed: req.speed,
        voiceId,
        serverVoiceId,
        type: req.type,
        audioUrl,
        provider,
        upstreamCache,
        upstreamDurationMs: Number.isFinite(upstreamDurationMs) ? upstreamDurationMs : undefined,
        contentType,
        audioBytes: blob.size,
        createdAt: new Date().toISOString(),
      };

      // Evict oldest items if cache exceeds 40 entries to prevent memory leaks
      if (this.assetCache.size >= 40) {
        const oldestKey = this.assetCache.keys().next().value;
        if (oldestKey !== undefined) {
          const oldAsset = this.assetCache.get(oldestKey);
          if (oldAsset) {
            try {
              URL.revokeObjectURL(oldAsset.audioUrl);
            } catch (err) {
              console.warn("[tts] failed to revoke audio URL:", err);
            }
          }
          this.assetCache.delete(oldestKey);
        }
      }

      this.assetCache.set(key, asset);
      this.configured = true;

      if (import.meta.env?.DEV) {
        const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
        console.debug(
          `[tts] provider=${provider} voice=${serverVoiceId ?? "?"} upstream=${upstreamCache ?? "?"} type=${req.type} accent=${req.accent} speed=${req.speed} bytes=${blob.size} duration_ms=${Math.round(ended - started)}`,
        );
      }
      return asset;
    })();

    this.inflight.set(key, pending);
    try {
      return await pending;
    } finally {
      this.inflight.delete(key);
    }
  }

  async speak(req: SpeechRequest, opts?: SpeakOptions): Promise<SpeechResult> {
    const voiceId = req.voiceId ?? defaultVoiceId(req.accent);
    const key = cacheKey({ ...req, voiceId });
    const wasCached = this.assetCache.has(key);

    opts?.onState?.(wasCached ? "cached" : "synthesizing");
    const asset = await this.ensureAsset(req, opts?.signal);
    if (opts?.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    opts?.onState?.("loading_audio");
    this.stop();
    return new Promise<SpeechResult>((resolve, reject) => {
      const audio = new Audio(asset.audioUrl);
      const playbackRate = playbackRateForSpeed(req.speed, req.type);
      audio.playbackRate = playbackRate;
      // Re-apply on metadata load (some browsers reset rate when src changes).
      audio.onloadedmetadata = () => {
        try {
          audio.playbackRate = playbackRate;
        } catch {
          /* noop */
        }
      };
      this.audio = audio;
      const onAbort = () => {
        this.stop();
        reject(new DOMException("Aborted", "AbortError"));
      };
      opts?.signal?.addEventListener("abort", onAbort, { once: true });

      audio.onplaying = () => opts?.onState?.("playing");
      audio.onended = () => {
        opts?.signal?.removeEventListener("abort", onAbort);
        this.audio = null;
        resolve({
          provider: asset.provider,
          cached: wasCached,
          upstreamCache: asset.upstreamCache,
          audioUrl: asset.audioUrl,
          durationMs: asset.durationMs,
          voiceId: asset.serverVoiceId ?? asset.voiceId,
          accent: asset.accent,
          contentType: asset.contentType,
          audioBytes: asset.audioBytes,
          playbackRate,
          upstreamDurationMs: asset.upstreamDurationMs,
        });
      };
      audio.onerror = () => {
        opts?.signal?.removeEventListener("abort", onAbort);
        this.audio = null;
        reject(new Error("Не удалось воспроизвести аудио с сервера."));
      };
      void audio.play().catch((err) => {
        opts?.signal?.removeEventListener("abort", onAbort);
        this.audio = null;
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
  }

  stop(): void {
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch {
        /* noop */
      }
      this.audio = null;
    }
  }
}

// ---------------- Selection logic ----------------------------------------

let _browser: BrowserSpeechProvider | null = null;
let _server: ServerSpeechProvider | null = null;

function getBrowserProvider(): BrowserSpeechProvider {
  if (!_browser) _browser = new BrowserSpeechProvider();
  return _browser;
}

function getServerProvider(): ServerSpeechProvider {
  if (!_server) _server = new ServerSpeechProvider();
  return _server;
}

export type ProviderStatus = "server" | "browser" | "none" | "unknown";

/** Quick, synchronous best-guess status for UI badges. */
export function getProviderStatusSync(): ProviderStatus {
  const server = getServerProvider();
  const browser = getBrowserProvider();
  // @ts-expect-error — reading private probe result is fine here
  const cfg: boolean | null = server.configured ?? null;
  if (cfg === true) return "server";
  if (cfg === false) return browser.isAvailable() ? "browser" : "none";
  return browser.isAvailable() ? "unknown" : "none";
}

/** Async probe — resolves the actual provider that will be used. */
export async function resolveActiveProvider(): Promise<ProviderStatus> {
  const server = getServerProvider();
  const browser = getBrowserProvider();
  const ok = await server.probe();
  if (ok) return "server";
  if (browser.isAvailable()) return "browser";
  return "none";
}

/**
 * Backwards-compatible accessor. Returns the browser provider (always-on
 * fallback). For new code prefer `speak()` which selects automatically.
 */
export function getSpeechProvider(): SpeechProvider {
  return getBrowserProvider();
}

/**
 * Main speak entrypoint: try server TTS first if configured, fall back to
 * the browser provider. Stops any currently-playing audio first so playback
 * never overlaps.
 */
export async function speak(req: SpeechRequest, opts?: SpeakOptions): Promise<SpeechResult> {
  const server = getServerProvider();
  const browser = getBrowserProvider();

  // Stop both providers to guarantee no overlapping playback.
  server.stop();
  browser.stop();

  opts?.onState?.("preparing");
  const useServer = await server.probe();
  if (useServer) {
    try {
      return await server.speak(req, opts);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") throw err;
      if (opts?.noFallback) {
        opts?.onState?.("error");
        throw err;
      }
      console.warn("Server TTS failed, falling back to browser:", err);
      opts?.onState?.("fallback");
    }
  } else if (opts?.noFallback) {
    opts?.onState?.("error");
    throw new Error("Серверная озвучка недоступна, fallback отключён.");
  }

  if (browser.isAvailable()) {
    opts?.onState?.("playing");
    const res = await browser.speak(req);
    return { ...res, voiceId: "browser", accent: req.accent };
  }
  opts?.onState?.("error");
  throw new Error("В этом браузере и на сервере недоступен голосовой движок.");
}

/**
 * Quietly prefetch (synthesize + cache) audio for the next item. Silent on
 * errors. At most one prefetch may run at a time across the whole app — if a
 * prefetch is already in flight, additional calls are dropped until it
 * completes. Already-cached requests are skipped.
 */
let _prefetchInFlight: Promise<unknown> | null = null;
export function prefetchSpeech(req: SpeechRequest): void {
  const server = getServerProvider();
  if (server.hasCached(req)) return;
  if (_prefetchInFlight) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("TimeoutError", "AbortError"));
  }, 4000);

  const p = server
    .ensureAsset(req, controller.signal)
    .catch((err) => {
      if (import.meta.env?.DEV) {
        console.debug("prefetchSpeech ignored:", err);
      }
    })
    .finally(() => {
      clearTimeout(timeoutId);
      if (_prefetchInFlight === p) _prefetchInFlight = null;
    });
  _prefetchInFlight = p;
}

export function hasCachedSpeech(req: SpeechRequest): boolean {
  return getServerProvider().hasCached(req);
}

/** Stop any in-flight audio from either provider. */
export function stopSpeaking(): void {
  getServerProvider().stop();
  getBrowserProvider().stop();
}

/**
 * Explicit browser-only playback. Use as a fallback when the server provider
 * has been aborted (e.g. after a timeout) and we still want to play something
 * audible. Does NOT accept an AbortSignal — the signal that aborted the server
 * request must not also abort this fallback playback.
 */
export async function speakBrowserFallback(req: SpeechRequest): Promise<SpeechResult> {
  const browser = getBrowserProvider();
  if (!browser.isAvailable()) {
    throw new Error("Браузерный голосовой движок недоступен.");
  }
  // Make sure no server audio is still playing.
  getServerProvider().stop();
  const res = await browser.speak(req);
  return { ...res, voiceId: "browser", accent: req.accent };
}
