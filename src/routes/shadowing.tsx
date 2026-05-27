import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, Check, Play, RotateCw, Square, Volume2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VERB_GROUPS } from "@/lib/data/groups";
import { VERBS, VERBS_BY_GROUP, VERBS_BY_ID } from "@/lib/data/verbs";
import { recordListen, recordShadowingDone, recordShadowingHard } from "@/lib/progress";
import { getSettings, getShadowing } from "@/lib/storage";
import { isSpeechAvailable, speak as speakAudio, stopSpeaking } from "@/lib/speech";
import type { Accent, SpeechRequest, SpeechSpeed, Verb } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SHADOWING_MODES = ["forms", "sentences", "group_rhythm", "weak", "compare"] as const;
type Mode = (typeof SHADOWING_MODES)[number];

type Search = {
  verbId?: string;
  groupId?: string;
  mode?: Mode;
};

const MODE_LABEL: Record<Mode, string> = {
  forms: "Формы глагола",
  sentences: "Фразы с глаголом",
  group_rhythm: "Групповой ритм",
  weak: "Сложные для Shadowing",
  compare: "British vs American",
};

function isMode(v: unknown): v is Mode {
  return typeof v === "string" && (SHADOWING_MODES as readonly string[]).includes(v);
}

export const Route = createFileRoute("/shadowing")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    verbId: typeof s.verbId === "string" ? s.verbId : undefined,
    groupId: typeof s.groupId === "string" ? s.groupId : undefined,
    mode: isMode(s.mode) ? s.mode : undefined,
  }),
  component: ShadowingPage,
});

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function ShadowingPage() {
  const search = Route.useSearch();
  const settings = useMemo(() => getSettings(), []);
  const [accent, setAccent] = useState<Accent>(settings.defaultAccent);
  const [speed, setSpeed] = useState<SpeechSpeed>(settings.defaultSpeed);
  const [mode, setMode] = useState<Mode>(
    search.mode ?? (search.groupId ? "group_rhythm" : "forms"),
  );
  const [verbIndex, setVerbIndex] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
      const group = VERB_GROUPS.find((g) => (VERBS_BY_GROUP[g.id]?.length ?? 0) >= 3);
      return group ? VERBS_BY_GROUP[group.id].slice(0, 5) : VERBS.slice(0, 5);
    }
    return VERBS;
  }, [mode, search.verbId, search.groupId]);

  useEffect(() => {
    setSpeechAvailable(isSpeechAvailable());
    return () => {
      abortRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    setVerbIndex(0);
    setPhraseIndex(0);
    stopSpeaking();
    setIsSpeaking(false);
  }, [mode, search.verbId, search.groupId]);

  const verb: Verb | undefined = queue[verbIndex];

  function currentRequest(): SpeechRequest | null {
    if (!verb) return null;
    if (mode === "forms" || mode === "weak") {
      return { text: verb.shadowing.formsText, accent, speed, type: "verb_forms" };
    }
    if (mode === "sentences") {
      return {
        text:
          verb.shadowing.sentenceTexts[phraseIndex] ??
          verb.shadowing.sentenceTexts[0] ??
          verb.shadowing.formsText,
        accent,
        speed,
        type: "sentence",
      };
    }
    if (mode === "group_rhythm") {
      return {
        text: queue.map((v) => v.shadowing.formsText).join("\n"),
        accent,
        speed,
        type: "group_sequence",
      };
    }
    return null;
  }

  async function playCurrent() {
    if (!verb || isSpeaking) return;
    if (!speechAvailable) {
      toast.error("Голос недоступен. Попробуйте Chrome, Edge или Safari.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    stopSpeaking();
    setIsSpeaking(true);
    try {
      if (mode === "compare") {
        const text = verb.shadowing.sentenceTexts[0] ?? verb.shadowing.formsText;
        for (let i = 0; i < settings.repeatPhraseCount; i++) {
          await speakAudio(
            { text, accent: "british", speed, type: "sentence" },
            { signal: controller.signal },
          );
          await delay(settings.pauseAfterSpeakerSec * 1000, controller.signal);
          await speakAudio(
            { text, accent: "american", speed, type: "sentence" },
            { signal: controller.signal },
          );
          if (i < settings.repeatPhraseCount - 1) await delay(400, controller.signal);
        }
      } else {
        const req = currentRequest();
        if (!req) throw new Error("Нет текста для воспроизведения.");
        const repeats = mode === "group_rhythm" ? 1 : settings.repeatPhraseCount;
        for (let i = 0; i < repeats; i++) {
          await speakAudio(req, { signal: controller.signal });
          if (i < repeats - 1) await delay(400, controller.signal);
        }
      }

      recordListen(verb.id);
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        toast.error(e instanceof Error ? e.message : "Ошибка воспроизведения.");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsSpeaking(false);
    }
  }

  function stopPlayback() {
    abortRef.current?.abort();
    abortRef.current = null;
    stopSpeaking();
    setIsSpeaking(false);
  }

  function next() {
    if (mode === "sentences" && verb && phraseIndex + 1 < verb.shadowing.sentenceTexts.length) {
      setPhraseIndex((i) => i + 1);
      return;
    }
    setPhraseIndex(0);
    setVerbIndex((i) => (queue.length > 0 ? (i + 1) % queue.length : 0));
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
            Нет глаголов для этого режима. Попробуйте сменить режим или отметить сложные глаголы.
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentText = !verb
    ? ""
    : mode === "compare"
      ? (verb.shadowing.sentenceTexts[0] ?? verb.shadowing.formsText)
      : mode === "sentences"
        ? (verb.shadowing.sentenceTexts[phraseIndex] ?? verb.shadowing.formsText)
        : mode === "group_rhythm"
          ? queue.map((v) => v.shadowing.formsText).join(" · ")
          : verb.shadowing.formsText;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Shadowing</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Слушайте формы и фразы, затем повторяйте вслух.
        </p>
      </header>

      <div
        className={cn(
          "flex items-start gap-2 rounded-md border p-3 text-sm",
          speechAvailable
            ? "border-sky-200 bg-sky-50 text-sky-900"
            : "border-amber-200 bg-amber-50 text-amber-900",
        )}
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {speechAvailable
            ? "Голос браузера. Качество зависит от системных голосов."
            : "Голос недоступен. Попробуйте Chrome, Edge или Safari."}
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
            <Label htmlFor="shadowing-accent" className="text-xs">
              Акцент
            </Label>
            <Select value={accent} onValueChange={(v) => setAccent(v as Accent)}>
              <SelectTrigger id="shadowing-accent" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="british">British English</SelectItem>
                <SelectItem value="american">American English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="shadowing-speed" className="text-xs">
              Скорость
            </Label>
            <Select value={speed} onValueChange={(v) => setSpeed(v as SpeechSpeed)}>
              <SelectTrigger id="shadowing-speed" className="mt-1.5">
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
            <Label htmlFor="shadowing-mode" className="text-xs">
              Режим
            </Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger id="shadowing-mode" className="mt-1.5">
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
          <div className="text-xs text-muted-foreground">
            {mode === "sentences"
              ? "Фраза"
              : mode === "group_rhythm"
                ? "Последовательность"
                : "Формы"}
          </div>
          <div className="rounded-md bg-secondary/50 p-5 text-center">
            <div className="font-mono text-lg md:text-xl">{currentText}</div>
            {verb && <div className="mt-2 text-sm text-muted-foreground">{verb.translation}</div>}
          </div>

          <div className="flex justify-center items-center gap-1.5 h-8 my-1">
            <div
              className={cn(
                "w-1 h-6 rounded-full bg-primary transition-all duration-300 origin-center",
                isSpeaking ? "animate-wave" : "scale-y-[0.25] opacity-40",
              )}
              style={{ animationDelay: "0.1s" }}
            />
            <div
              className={cn(
                "w-1 h-6 rounded-full bg-primary transition-all duration-300 origin-center",
                isSpeaking ? "animate-wave" : "scale-y-[0.4] opacity-40",
              )}
              style={{ animationDelay: "0.3s" }}
            />
            <div
              className={cn(
                "w-1 h-6 rounded-full bg-primary transition-all duration-300 origin-center",
                isSpeaking ? "animate-wave" : "scale-y-[0.15] opacity-40",
              )}
              style={{ animationDelay: "0.5s" }}
            />
            <div
              className={cn(
                "w-1 h-6 rounded-full bg-primary transition-all duration-300 origin-center",
                isSpeaking ? "animate-wave" : "scale-y-[0.5] opacity-40",
              )}
              style={{ animationDelay: "0.2s" }}
            />
            <div
              className={cn(
                "w-1 h-6 rounded-full bg-primary transition-all duration-300 origin-center",
                isSpeaking ? "animate-wave" : "scale-y-[0.3] opacity-40",
              )}
              style={{ animationDelay: "0.4s" }}
            />
          </div>

          <div
            className={cn(
              "flex items-center justify-center gap-2 text-xs",
              isSpeaking ? "text-primary" : "text-muted-foreground",
            )}
            aria-live="polite"
          >
            <Volume2 className={cn("h-4 w-4", isSpeaking && "animate-pulse")} />
            <span>{isSpeaking ? "Воспроизводится" : "Готово к воспроизведению"}</span>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              className="h-14 text-base"
              onClick={playCurrent}
              disabled={isSpeaking}
            >
              <Play className="mr-2 h-5 w-5" />
              Прослушать
            </Button>
            {isSpeaking && (
              <Button variant="outline" onClick={stopPlayback}>
                <Square className="mr-2 h-4 w-4" /> Остановить
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => void playCurrent()} disabled={isSpeaking}>
                <RotateCw className="mr-2 h-4 w-4" /> Повторить
              </Button>
              <Button variant="secondary" onClick={next} disabled={isSpeaking}>
                Следующий
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={markHard} disabled={isSpeaking}>
                <AlertTriangle className="mr-2 h-4 w-4" /> Сложно
              </Button>
              <Button onClick={markDone} disabled={isSpeaking}>
                <Check className="mr-2 h-4 w-4" /> Я повторил
              </Button>
            </div>
          </div>

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
