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

// Module-level set that holds strong references to active utterances.
// Chrome/Safari may garbage-collect SpeechSynthesisUtterance objects
// during playback if no JS reference exists, silently stopping speech
// and leaving the promise hanging. Entries are removed in onend/onerror.
const activeUtterances = new Set<SpeechSynthesisUtterance>();

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
        activeUtterances.delete(utterance);
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

      activeUtterances.add(utterance);
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
    activeUtterances.clear();
    this.current = null;
  }
}

let browserProvider: BrowserSpeechProvider | null = null;

function getBrowserProvider(): BrowserSpeechProvider {
  if (!browserProvider) browserProvider = new BrowserSpeechProvider();
  return browserProvider;
}

export function preprocessSpeechText(text: string, type: SpeechRequest["type"]): string {
  let processed = text;

  if (type === "verb_forms") {
    // 1. "read" forms: read — read — read -> read — red — red
    processed = processed.replace(
      /\bread\s*([—–\-,/|]+)\s*read\s*([—–\-,/|]+)\s*read\b/gi,
      (match, p1, p2) => {
        const isUpper = match.startsWith("READ");
        return isUpper ? `READ ${p1} RED ${p2} RED` : `read ${p1} red ${p2} red`;
      },
    );

    // 2. "wind" forms: wind — wound — wound -> wined — wound — wound
    processed = processed.replace(
      /\bwind\s*([—–\-,/|]+)\s*wound\s*([—–\-,/|]+)\s*wound\b/gi,
      (match, p1, p2) => {
        const isUpper = match.startsWith("WIND");
        return isUpper ? `WINED ${p1} WOUND ${p2} WOUND` : `wined ${p1} wound ${p2} wound`;
      },
    );

    // 3. "tear" forms: tear — tore — torn -> tare — tore — torn
    processed = processed.replace(
      /\btear\s*([—–\-,/|]+)\s*tore\s*([—–\-,/|]+)\s*torn\b/gi,
      (match, p1, p2) => {
        const isUpper = match.startsWith("TEAR");
        return isUpper ? `TARE ${p1} TORE ${p2} TORN` : `tare ${p1} tore ${p2} torn`;
      },
    );

    // 4. "sow" forms: sow — sowed — sown -> sew — sowed — sown
    processed = processed.replace(
      /\bsow\s*([—–\-,/|]+)\s*sowed\s*([—–\-,/|]+)\s*sown\b/gi,
      (match, p1, p2) => {
        const isUpper = match.startsWith("SOW");
        return isUpper ? `SEW ${p1} SOWED ${p2} SOWN` : `sew ${p1} sowed ${p2} sown`;
      },
    );
  } else if (type === "group_sequence") {
    const lines = processed.split("\n");
    const processedLines = lines.map((line) => preprocessSpeechText(line, "verb_forms"));
    processed = processedLines.join("\n");
  } else if (type === "sentence") {
    // For sentences containing "read" in past context (all occurrences in DB), replace with "red" for TTS
    processed = processed.replace(/\bread\b/gi, (match) => {
      if (match === "Read") return "Red";
      if (match === "READ") return "RED";
      return "red";
    });
  }

  return processed;
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
    const processedText = preprocessSpeechText(req.text, req.type);
    const processedReq = { ...req, text: processedText };
    const result = await provider.speak(processedReq, opts?.signal);
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
