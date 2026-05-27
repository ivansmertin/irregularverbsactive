import type { Accent, SpeechRequest, SpeechResult, SpeechSpeed } from "./types";

export interface SpeechProvider {
  name: string;
  kind: "browser";
  speak(req: SpeechRequest, signal?: AbortSignal): Promise<SpeechResult>;
  stop(): void;
  isAvailable(): boolean;
}

export type SpeechState = "idle" | "playing" | "error";

export type SpeakOptions = {
  onState?: (state: SpeechState) => void;
  signal?: AbortSignal;
};

const browserSpeedToRate: Record<SpeechSpeed, number> = {
  slow: 0.65,
  normal: 0.8,
  fast: 0.95,
};

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

export class BrowserSpeechProvider implements SpeechProvider {
  name = "browser-speech-synthesis";
  kind = "browser" as const;
  private current: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (this.isAvailable()) {
      const loadVoices = () => window.speechSynthesis.getVoices();
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  isAvailable(): boolean {
    return isSpeechAvailable();
  }

  private pickVoice(accent: Accent): SpeechSynthesisVoice | undefined {
    if (!this.isAvailable()) return undefined;
    const voices = window.speechSynthesis.getVoices();
    const lang = accent === "british" ? "en-GB" : "en-US";
    const langLower = lang.toLowerCase();

    return (
      voices.find((voice) => voice.lang === lang) ||
      voices.find((voice) => voice.lang?.toLowerCase().startsWith(langLower)) ||
      voices.find((voice) => voice.lang?.toLowerCase().startsWith("en"))
    );
  }

  speak(req: SpeechRequest, signal?: AbortSignal): Promise<SpeechResult> {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable()) {
        reject(new Error("В этом браузере нет голосового движка для озвучки."));
        return;
      }
      if (signal?.aborted) {
        reject(abortError());
        return;
      }

      this.stop();

      const utterance = new SpeechSynthesisUtterance(req.text);
      const voice = this.pickVoice(req.accent);
      if (voice) utterance.voice = voice;
      utterance.lang = req.accent === "british" ? "en-GB" : "en-US";
      utterance.rate = browserSpeedToRate[req.speed];
      utterance.pitch = 1;
      this.current = utterance;

      const startedAt = Date.now();
      let settled = false;

      const finish = (handler: () => void) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        this.current = null;
        handler();
      };

      const onAbort = () => {
        const error = abortError();
        finish(() => reject(error));
        this.stop();
      };

      signal?.addEventListener("abort", onAbort, { once: true });

      utterance.onend = () => {
        finish(() =>
          resolve({
            provider: this.name,
            durationMs: Date.now() - startedAt,
            accent: req.accent,
          }),
        );
      };
      utterance.onerror = (event) => {
        if (event.error === "interrupted" || event.error === "canceled") {
          finish(() => resolve({ provider: this.name, accent: req.accent }));
          return;
        }
        finish(() => reject(new Error("Не удалось воспроизвести речь.")));
      };

      window.speechSynthesis.speak(utterance);
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

let browserProvider: BrowserSpeechProvider | null = null;

function getBrowserProvider(): BrowserSpeechProvider {
  if (!browserProvider) browserProvider = new BrowserSpeechProvider();
  return browserProvider;
}

export async function speak(req: SpeechRequest, opts?: SpeakOptions): Promise<SpeechResult> {
  const provider = getBrowserProvider();
  stopSpeaking();

  if (!provider.isAvailable()) {
    opts?.onState?.("error");
    throw new Error("Голос недоступен. Попробуйте Chrome, Edge или Safari.");
  }

  opts?.onState?.("playing");
  try {
    const result = await provider.speak(req, opts?.signal);
    opts?.onState?.("idle");
    return result;
  } catch (error) {
    opts?.onState?.((error as { name?: string })?.name === "AbortError" ? "idle" : "error");
    throw error;
  }
}

export function stopSpeaking(): void {
  getBrowserProvider().stop();
}

export function isSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
