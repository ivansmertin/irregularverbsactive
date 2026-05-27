import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, RotateCw, Volume2, AlertCircle, Check, AlertTriangle, Loader2, X } from "lucide-react";

import { VERBS, VERBS_BY_GROUP, VERBS_BY_ID } from "@/lib/data/verbs";
import { VERB_GROUPS } from "@/lib/data/groups";
import { getShadowing } from "@/lib/storage";
import {
  resolveActiveProvider,
  speak as speakAudio,
  speakBrowserFallback,
  stopSpeaking,
  prefetchSpeech,
  hasCachedSpeech,
  recommendedVoiceId,
  type ProviderStatus,
  type SpeechState,
} from "@/lib/speech";
import { getSettings } from "@/lib/storage";
import {
  recordListen,
  recordShadowingDone,
  recordShadowingHard,
} from "@/lib/progress";
import type { Accent, SpeechResult, SpeechSpeed, Verb } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SHADOWING_MODES = [
  "forms",
  "sentences",
  "group_rhythm",
  "weak",
  "compare",
] as const;
type Mode = (typeof SHADOWING_MODES)[number];

function isMode(v: unknown): v is Mode {
  return typeof v === "string" && (SHADOWING_MODES as readonly string[]).includes(v);
}

type Search = {
  verbId?: string;
  groupId?: string;
  mode?: Mode;
};

export const Route = createFileRoute("/shadowing")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    verbId: typeof s.verbId === "string" ? s.verbId : undefined,
    groupId: typeof s.groupId === "string" ? s.groupId : undefined,
    mode: isMode(s.mode) ? s.mode : undefined,
  }),
  component: ShadowingPage,
});

const MODE_LABEL: Record<Mode, string> = {
  forms: "Формы глагола",
  sentences: "Фразы с глаголом",
  group_rhythm: "Групповой ритм",
  weak: "Слабые для Shadowing",
  compare: "British vs American",
};


function ShadowingPage() {
  const search = Route.useSearch();
  const settings = useMemo(() => getSettings(), []);
  const [accent, setAccent] = useState<Accent>(settings.defaultAccent);
  const [speed, setSpeed] = useState<SpeechSpeed>(settings.defaultSpeed);
  const [mode, setMode] = useState<Mode>(search.mode ?? (search.groupId ? "group_rhythm" : "forms"));
  const [verbIndex, setVerbIndex] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [ttsState, setTtsState] = useState<SpeechState>("idle");
  const [slowHint, setSlowHint] = useState(false);
  const [cacheHint, setCacheHint] = useState<null | "memory" | "upstream" | "miss">(null);
  const [cacheDurationMs, setCacheDurationMs] = useState<number | null>(null);
  const [lastSpeechResult, setLastSpeechResult] = useState<SpeechResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>("unknown");
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const isBusy = ttsState !== "idle" && ttsState !== "error";

  const queue = useMemo(() => {
    const sh = getShadowing();
    if (search.verbId && VERBS_BY_ID[search.verbId]) {
      return [VERBS_BY_ID[search.verbId]];
    }
    if (search.groupId) {
      return VERBS_BY_GROUP[search.groupId] ?? [];
    }
    if (mode === "weak") {
      return VERBS.filter((v) => sh[v.id]?.isWeakForShadowing);
    }
    if (mode === "group_rhythm") {
      // first group with at least 3 verbs
      const grp = VERB_GROUPS.find((g) => (VERBS_BY_GROUP[g.id]?.length ?? 0) >= 3);
      return grp ? VERBS_BY_GROUP[grp.id].slice(0, 5) : VERBS.slice(0, 5);
    }
    return VERBS;
  }, [mode, search.verbId, search.groupId]);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    resolveActiveProvider().then((s) => {
      if (!cancelled) setProviderStatus(s);
    });
    return () => {
      cancelled = true;
      mountedRef.current = false;
      abortRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  // Reset indices when queue changes
  useEffect(() => {
    setVerbIndex(0);
    setPhraseIndex(0);
  }, [mode, search.verbId, search.groupId]);

  const verb: Verb | undefined = queue[verbIndex];

  type ReqType = "verb_forms" | "sentence" | "group_sequence";

  function buildNextPrefetch(): { text: string; type: ReqType; accent: Accent } | null {
    if (mode === "sentences" && verb) {
      const nextIdx = phraseIndex + 1;
      if (nextIdx < verb.shadowing.sentenceTexts.length) {
        return { text: verb.shadowing.sentenceTexts[nextIdx], type: "sentence", accent };
      }
    }
    if (queue.length > 1 && (mode === "forms" || mode === "weak" || mode === "sentences")) {
      const nv = queue[(verbIndex + 1) % queue.length];
      if (mode === "sentences") {
        return { text: nv.shadowing.sentenceTexts[0], type: "sentence", accent };
      }
      return { text: nv.shadowing.formsText, type: "verb_forms", accent };
    }
    return null;
  }

  async function speakOne(
    text: string,
    type: ReqType,
    forcedAccent: Accent | undefined,
    setState: (s: SpeechState) => void,
    signal: AbortSignal,
  ) {
    const effAccent = forcedAccent ?? accent;
    const voiceId = recommendedVoiceId(effAccent, settings.voiceGender);
    return speakAudio(
      { text, accent: effAccent, speed, type, voiceId },
      { onState: setState, signal },
    );
  }

  /**
   * Build a single-utterance request suitable for browser fallback playback.
   * Returns null when there is nothing playable (e.g. no verb selected).
   */
  function buildFallbackRequest(): {
    text: string;
    type: ReqType;
    accent: Accent;
  } | null {
    if (!verb) return null;
    if (mode === "forms" || mode === "weak") {
      return { text: verb.shadowing.formsText, type: "verb_forms", accent };
    }
    if (mode === "sentences") {
      const t = verb.shadowing.sentenceTexts[phraseIndex] ?? verb.shadowing.sentenceTexts[0];
      return { text: t, type: "sentence", accent };
    }
    if (mode === "group_rhythm") {
      return {
        text: queue.map((v) => v.shadowing.formsText).join("\n"),
        type: "group_sequence",
        accent,
      };
    }
    if (mode === "compare") {
      // Pick the first sentence in the user's current accent for fallback.
      return { text: verb.shadowing.sentenceTexts[0], type: "sentence", accent };
    }
    return null;
  }

  async function playCurrent() {
    if (!verb || isBusy) return;
    if (providerStatus === "none") {
      toast.error("Голосовой движок недоступен.");
      return;
    }

    stopSpeaking();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setCacheHint(null);
    setCacheDurationMs(null);
    setSlowHint(false);
    setLastSpeechResult(null);
    setTtsState("preparing");

    // Tracks whether the server request was aborted by our own timeout (vs.
    // by route change / explicit cancel). Only timeout-aborts trigger an
    // explicit browser fallback playback.
    let timedOut = false;

    const slowTimer = window.setTimeout(() => {
      if (!controller.signal.aborted && mountedRef.current) setSlowHint(true);
    }, 2500);
    const fallbackTimer = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      timedOut = true;
      controller.abort();
    }, 4000);

    const setState = (s: SpeechState) => {
      if (!mountedRef.current) return;
      setTtsState(s);
      if (s === "playing" || s === "cached") setSlowHint(false);
    };

    try {
      const primaryReq = (() => {
        if (mode === "forms" || mode === "weak") {
          return { text: verb.shadowing.formsText, type: "verb_forms" as ReqType };
        }
        if (mode === "sentences") {
          const t = verb.shadowing.sentenceTexts[phraseIndex] ?? verb.shadowing.sentenceTexts[0];
          return { text: t, type: "sentence" as ReqType };
        }
        if (mode === "group_rhythm") {
          return {
            text: queue.map((v) => v.shadowing.formsText).join("\n"),
            type: "group_sequence" as ReqType,
          };
        }
        return null;
      })();

      const primaryVoiceId = primaryReq
        ? recommendedVoiceId(accent, settings.voiceGender)
        : undefined;
      const wasCached =
        primaryReq != null &&
        hasCachedSpeech({
          text: primaryReq.text,
          accent,
          speed,
          type: primaryReq.type,
          voiceId: primaryVoiceId,
        });

      let lastUpstream: "HIT" | "MISS" | undefined;
      let lastUpstreamDurationMs: number | undefined;

      if (mode === "compare" && verb) {
        const text = verb.shadowing.sentenceTexts[0];
        for (let i = 0; i < settings.repeatPhraseCount; i++) {
          const r1 = await speakOne(text, "sentence", "british", setState, controller.signal);
          lastUpstream = r1?.upstreamCache ?? lastUpstream;
          lastUpstreamDurationMs = r1?.upstreamDurationMs ?? lastUpstreamDurationMs;
          if (mountedRef.current) setLastSpeechResult(r1);
          await new Promise((r) => setTimeout(r, settings.pauseAfterSpeakerSec * 1000));
          const r2 = await speakOne(text, "sentence", "american", setState, controller.signal);
          lastUpstream = r2?.upstreamCache ?? lastUpstream;
          lastUpstreamDurationMs = r2?.upstreamDurationMs ?? lastUpstreamDurationMs;
          if (mountedRef.current) setLastSpeechResult(r2);
          if (i < settings.repeatPhraseCount - 1) await new Promise((r) => setTimeout(r, 400));
        }
      } else if (primaryReq) {
        const repeats = mode === "group_rhythm" ? 1 : settings.repeatPhraseCount;
        for (let i = 0; i < repeats; i++) {
          const r = await speakOne(
            primaryReq.text,
            primaryReq.type,
            undefined,
            setState,
            controller.signal,
          );
          lastUpstream = r?.upstreamCache ?? lastUpstream;
          lastUpstreamDurationMs = r?.upstreamDurationMs ?? lastUpstreamDurationMs;
          if (mountedRef.current) setLastSpeechResult(r);
          if (i < repeats - 1) await new Promise((r) => setTimeout(r, 400));
        }
      }

      if (verb) recordListen(verb.id);
      if (mountedRef.current) {
        if (wasCached) setCacheHint("memory");
        else if (lastUpstream === "HIT") setCacheHint("upstream");
        else setCacheHint("miss");
        setCacheDurationMs(
          typeof lastUpstreamDurationMs === "number" ? lastUpstreamDurationMs : null,
        );
        setTtsState("idle");
      }

      // Prefetch exactly one next item, but only after a successful playback,
      // never in compare mode, and only if the user opted in. The speech
      // module also serializes prefetches globally.
      if (settings.prefetchNext && mode !== "compare") {
        const np = buildNextPrefetch();
        if (np) {
          prefetchSpeech({
            text: np.text,
            accent: np.accent,
            speed,
            type: np.type,
            voiceId: recommendedVoiceId(np.accent, settings.voiceGender),
          });
        }
      }
    } catch (e) {
      const isAbort = (e as { name?: string })?.name === "AbortError";

      if (isAbort && timedOut && mountedRef.current) {
        // Server took too long. Explicitly play browser fallback so the UI
        // promise of "Используется голос браузера" is honest.
        const fbReq = buildFallbackRequest();
        toast.warning(
          "Kokoro отвечает слишком долго. Используется голос браузера.",
        );
        setTtsState("fallback");
        try {
          if (!fbReq) throw new Error("Нет текста для воспроизведения.");
          setState("playing");
          // NOTE: do NOT pass controller.signal — it is already aborted.
          const fbRes = await speakBrowserFallback({
            text: fbReq.text,
            accent: fbReq.accent,
            speed,
            type: fbReq.type,
          });
          if (mountedRef.current) {
            setLastSpeechResult(fbRes);
            setTtsState("idle");
          }
        } catch (fbErr) {
          if (mountedRef.current) {
            setTtsState("error");
            toast.error(
              fbErr instanceof Error
                ? fbErr.message
                : "Не удалось воспроизвести браузерный голос.",
            );
            window.setTimeout(
              () => mountedRef.current && setTtsState("idle"),
              1500,
            );
          }
        }
      } else if (isAbort) {
        // Aborted by route change / cancel button — silent reset.
        if (mountedRef.current) setTtsState("idle");
      } else {
        const msg = e instanceof Error ? e.message : "Ошибка воспроизведения.";
        if (mountedRef.current) {
          setTtsState("error");
          toast.error(msg);
          window.setTimeout(() => mountedRef.current && setTtsState("idle"), 1500);
        }
      }
    } finally {
      window.clearTimeout(slowTimer);
      window.clearTimeout(fallbackTimer);
    }
  }

  function cancelPlayback() {
    abortRef.current?.abort();
    stopSpeaking();
    setTtsState("idle");
    setSlowHint(false);
  }

  function next() {
    if (mode === "sentences" && verb && phraseIndex + 1 < verb.shadowing.sentenceTexts.length) {
      setPhraseIndex((i) => i + 1);
    } else {
      setPhraseIndex(0);
      setVerbIndex((i) => (queue.length > 0 ? (i + 1) % queue.length : 0));
    }
  }

  function markDone() {
    if (!verb) return;
    recordShadowingDone(verb.id);
    toast.success("Записано: «Я повторил».");
    next();
  }
  function markHard() {
    if (!verb) return;
    recordShadowingHard(verb.id);
    toast.message("Глагол отмечен как сложный.");
    next();
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Нет глаголов для этого режима. Попробуйте сменить режим или добавить глаголы в слабые.
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentText =
    !verb
      ? ""
      : mode === "sentences"
        ? verb.shadowing.sentenceTexts[phraseIndex] ?? ""
        : mode === "group_rhythm"
          ? queue.map((v) => v.shadowing.formsText).join(" · ")
          : verb.shadowing.formsText;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Shadowing</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Послушайте диктора и повторите за ним вслух. Регулярная практика автоматизирует формы и
          улучшает произношение.
        </p>
      </header>

      <div
        className={cn(
          "flex items-start gap-2 rounded-md border p-3 text-sm",
          providerStatus === "server" &&
            lastSpeechResult?.provider === "kokoro" &&
            "border-emerald-200 bg-emerald-50 text-emerald-900",
          providerStatus === "server" &&
            lastSpeechResult?.provider !== "kokoro" &&
            "border-sky-200 bg-sky-50 text-sky-900",
          (providerStatus === "browser" || providerStatus === "unknown") &&
            "border-sky-200 bg-sky-50 text-sky-900",
          providerStatus === "none" &&
            "border-amber-200 bg-amber-50 text-amber-900",
        )}
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {providerStatus === "server" && !lastSpeechResult &&
            "Kokoro настроен. Нажмите «Прослушать», чтобы проверить голос."}
          {providerStatus === "server" && lastSpeechResult?.provider === "kokoro" &&
            "Качественная озвучка Kokoro: доступна."}
          {providerStatus === "server" && lastSpeechResult && lastSpeechResult.provider !== "kokoro" &&
            "Используется голос браузера."}
          {providerStatus === "browser" &&
            "Используется голос браузера. Качество зависит от системных голосов."}
          {providerStatus === "unknown" && "Определяем доступный голосовой движок…"}
          {providerStatus === "none" &&
            "Голос недоступен. Попробуйте Chrome, Edge или Safari."}
        </span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Настройки воспроизведения</CardTitle>
            <Badge variant="secondary">{MODE_LABEL[mode]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs">Акцент</Label>
            <Select value={accent} onValueChange={(v) => setAccent(v as Accent)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="british">British English</SelectItem>
                <SelectItem value="american">American English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Скорость</Label>
            <Select value={speed} onValueChange={(v) => setSpeed(v as SpeechSpeed)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Очень медленно</SelectItem>
                <SelectItem value="normal">Учебный темп</SelectItem>
                <SelectItem value="fast">Быстрее</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Режим</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHADOWING_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MODE_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {mode === "sentences" ? "Фраза" : mode === "group_rhythm" ? "Последовательность" : "Формы"}
          </div>
          <div className="rounded-md bg-secondary/50 p-5 text-center">
            <div className="font-mono text-lg md:text-xl">{currentText}</div>
            {verb && (
              <div className="mt-2 text-sm text-muted-foreground">{verb.translation}</div>
            )}
          </div>

          <div className="space-y-2">
            <div
              className={cn(
                "flex items-center justify-center gap-2 text-xs",
                isBusy ? "text-primary" : "text-muted-foreground",
              )}
              aria-live="polite"
            >
              {ttsState === "playing" ? (
                <Volume2 className="h-4 w-4 animate-pulse" />
              ) : isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              <span>
                {ttsState === "preparing" && "Готовим озвучку…"}
                {ttsState === "synthesizing" && "Синтезируем речь…"}
                {ttsState === "cached" && "Открыто из кэша"}
                {ttsState === "loading_audio" && "Загружаем аудио…"}
                {ttsState === "playing" && "Воспроизводится"}
                {ttsState === "fallback" && "Переключаемся на голос браузера…"}
                {ttsState === "error" && "Ошибка воспроизведения"}
                {ttsState === "idle" && (() => {
                  if (!cacheHint) return "Готово к воспроизведению";
                  const dur =
                    typeof cacheDurationMs === "number" && cacheDurationMs > 0
                      ? cacheDurationMs >= 1000
                        ? ` за ${(cacheDurationMs / 1000).toFixed(1)} с`
                        : ` за ${Math.round(cacheDurationMs)} мс`
                      : "";
                  if (cacheHint === "memory") return "Открыто из памяти";
                  if (cacheHint === "upstream") return `Открыто из кэша${dur}`;
                  return `Синтезировано${dur} и сохранено для следующих повторов`;
                })()}
              </span>
            </div>
            {isBusy && ttsState !== "playing" && (
              <div className="h-1 w-full overflow-hidden rounded bg-secondary">
                <div className="h-full w-1/3 animate-[shadow-loading_1.2s_ease-in-out_infinite] rounded bg-primary" />
              </div>
            )}
            {slowHint && isBusy && (
              <p className="text-center text-xs text-muted-foreground">
                Озвучка ещё генерируется… Первое прослушивание может занять несколько секунд.
                Повторное прослушивание будет быстрее.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              className="h-14 text-base"
              onClick={playCurrent}
              disabled={isBusy}
            >
              {isBusy ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Play className="mr-2 h-5 w-5" />
              )}
              {ttsState === "preparing" && "Готовим озвучку…"}
              {ttsState === "synthesizing" && "Синтезируем речь…"}
              {ttsState === "loading_audio" && "Загружаем аудио…"}
              {ttsState === "cached" && "Открыто из кэша"}
              {ttsState === "playing" && "Воспроизводится"}
              {(ttsState === "idle" || ttsState === "error" || ttsState === "fallback") &&
                "Прослушать"}
            </Button>
            {isBusy && (
              <Button variant="ghost" size="sm" onClick={cancelPlayback}>
                <X className="mr-2 h-4 w-4" /> Отмена
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  cancelPlayback();
                  setTimeout(playCurrent, 100);
                }}
                disabled={isBusy}
              >
                <RotateCw className="mr-2 h-4 w-4" /> Повторить
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  cancelPlayback();
                  next();
                }}
              >
                Следующий
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={markHard}>
                <AlertTriangle className="mr-2 h-4 w-4" /> Сложно
              </Button>
              <Button onClick={markDone}>
                <Check className="mr-2 h-4 w-4" /> Я повторил
              </Button>
            </div>
          </div>

          {lastSpeechResult && ttsState === "idle" && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {lastSpeechResult.provider === "kokoro" ? "Источник: Kokoro" : "Источник: голос браузера"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  className="text-[10px] underline underline-offset-2 hover:text-foreground"
                >
                  {showDetails ? "Скрыть" : "Подробнее"}
                </button>
              </div>
              {lastSpeechResult.provider !== "kokoro" && (
                <p className="mt-1 text-amber-700">
                  Сейчас используется голос браузера, а не Kokoro.
                </p>
              )}
              {showDetails && (
                <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground/80">Голос:</dt>
                  <dd className="text-foreground">
                    {lastSpeechResult.voiceId ?? "—"}
                  </dd>
                  <dt className="text-muted-foreground/80">Акцент:</dt>
                  <dd className="text-foreground">
                    {lastSpeechResult.accent === "british" ? "British English" : lastSpeechResult.accent === "american" ? "American English" : "—"}
                  </dd>
                  <dt className="text-muted-foreground/80">Кэш:</dt>
                  <dd className="text-foreground">
                    {lastSpeechResult.cached
                      ? "локальный кэш"
                      : lastSpeechResult.upstreamCache === "HIT"
                        ? "HIT"
                        : lastSpeechResult.upstreamCache === "MISS"
                          ? "MISS"
                          : "—"}
                  </dd>
                  {lastSpeechResult.audioBytes != null && (
                    <>
                      <dt className="text-muted-foreground/80">Размер:</dt>
                      <dd className="text-foreground">
                        {lastSpeechResult.audioBytes.toLocaleString("ru-RU")} bytes
                      </dd>
                    </>
                  )}
                  {typeof lastSpeechResult.playbackRate === "number" && (
                    <>
                      <dt className="text-muted-foreground/80">Темп воспроизведения:</dt>
                      <dd className="text-foreground">
                        {lastSpeechResult.playbackRate.toFixed(2)}x
                      </dd>
                    </>
                  )}
                </dl>
              )}
            </div>
          )}

          {queue.length > 1 && mode !== "group_rhythm" && (
            <div className="text-center text-xs text-muted-foreground">
              {verbIndex + 1} из {queue.length}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
