import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { resetAllProgress, saveSettings } from "@/lib/storage";
import { useSettings } from "@/hooks/use-storage";
import { BackupShapeError, downloadBackup, importBackupFromString } from "@/lib/backup";
import type { Accent, Settings, SpeechResult } from "@/lib/types";
import { toast } from "sonner";

type DiagVoice = {
  id: string;
  label: string;
  accent: Accent;
  gender: "female" | "male";
  recommended?: boolean;
  note?: string;
};

const KOKORO_DIAG_VOICES: DiagVoice[] = [
  // British — Female
  { id: "bf_emma", label: "bf_emma", accent: "british", gender: "female", recommended: true, note: "рекомендуемый британский женский" },
  { id: "bf_alice", label: "bf_alice", accent: "british", gender: "female" },
  { id: "bf_lily", label: "bf_lily", accent: "british", gender: "female" },
  // British — Male
  { id: "bm_lewis", label: "bm_lewis", accent: "british", gender: "male", recommended: true, note: "рекомендуемый британский мужской" },
  { id: "bm_daniel", label: "bm_daniel", accent: "british", gender: "male", note: "естественный британский мужской" },
  { id: "bm_george", label: "bm_george", accent: "british", gender: "male" },
  { id: "bm_fable", label: "bm_fable", accent: "british", gender: "male" },
  // American — Female
  { id: "af_sky", label: "af_sky", accent: "american", gender: "female", recommended: true, note: "рекомендуемый американский женский (учитель)" },
  { id: "af_heart", label: "af_heart", accent: "american", gender: "female", note: "тёплый американский женский" },
  { id: "af_bella", label: "af_bella", accent: "american", gender: "female" },
  { id: "af_nicole", label: "af_nicole", accent: "american", gender: "female" },
  { id: "af_sarah", label: "af_sarah", accent: "american", gender: "female" },
  { id: "af_aoede", label: "af_aoede", accent: "american", gender: "female" },
  { id: "af_jessica", label: "af_jessica", accent: "american", gender: "female" },
  { id: "af_nova", label: "af_nova", accent: "american", gender: "female" },
  // American — Male
  { id: "am_adam", label: "am_adam", accent: "american", gender: "male", recommended: true, note: "рекомендуемый американский мужской" },
  { id: "am_michael", label: "am_michael", accent: "american", gender: "male", note: "более низкий американский мужской" },
  { id: "am_eric", label: "am_eric", accent: "american", gender: "male" },
  { id: "am_liam", label: "am_liam", accent: "american", gender: "male" },
];

function voiceGenderFromId(id?: string): "female" | "male" | undefined {
  if (!id) return undefined;
  if (/^[ab]f_/.test(id)) return "female";
  if (/^[ab]m_/.test(id)) return "male";
  return undefined;
}

const DIAG_TEXT =
  "Voice test. I can't dance after class. The water is better in the city. Write. wrote. written.";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useSettings();
  const [diagAccent, setDiagAccent] = useState<Accent>("british");
  const [diagVoice, setDiagVoice] = useState<string>("bf_emma");
  const [diagNoFallback, setDiagNoFallback] = useState<boolean>(false);
  const [diagBusy, setDiagBusy] = useState<boolean>(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [diagResult, setDiagResult] = useState<SpeechResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImportText, setPendingImportText] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  function handleExport() {
    try {
      downloadBackup();
      toast.success("Прогресс экспортирован.");
    } catch {
      toast.error("Не удалось экспортировать прогресс.");
    }
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файл слишком большой для импорта.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast.error("Не удалось прочитать файл.");
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (!text) {
        toast.error("Файл не похож на экспорт прогресса.");
        return;
      }
      setPendingImportText(text);
      setImportOpen(true);
    };
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!pendingImportText) return;
    try {
      const res = importBackupFromString(pendingImportText);
      setPendingImportText(null);
      setImportOpen(false);
      toast.success("Прогресс успешно импортирован.");
      if (res.skippedUnknownVerbs.length > 0) {
        toast.message(
          "Часть данных пропущена: некоторые глаголы не найдены в текущей базе.",
          {
            description: `Пропущено идентификаторов: ${res.skippedUnknownVerbs.length}.`,
          },
        );
      }
      // saveProgress/saveShadowing/saveSessions inside importBackupFromString
      // emit store updates; every subscribed component re-renders with the
      // new values without a page reload.
    } catch (err) {
      setPendingImportText(null);
      setImportOpen(false);
      if (err instanceof BackupShapeError) {
        toast.error(err.message);
      } else {
        toast.error("Не удалось импортировать прогресс.");
      }
    }
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    // saveSettings emits a store-update; useSettings() picks it up on the
    // next render without needing a local state mirror.
    saveSettings({ ...settings, [key]: value });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Настройки</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Параметры тренировок и Shadowing. Сохраняются автоматически.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Прогресс хранится локально в этом браузере.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Тренировки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Количество вопросов по умолчанию">
            <Select
              value={String(settings.defaultQuestionCount)}
              onValueChange={(v) =>
                update("defaultQuestionCount", Number(v) as Settings["defaultQuestionCount"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 30].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Сложность">
            <Select
              value={settings.difficulty}
              onValueChange={(v) => update("difficulty", v as Settings["difficulty"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Лёгкий</SelectItem>
                <SelectItem value="standard">Стандартный</SelectItem>
                <SelectItem value="hard">Сложный</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <ToggleField
            label="Показывать перевод"
            description="Перевод глагола в карточках и упражнениях."
            checked={settings.showTranslation}
            onCheckedChange={(v) => update("showTranslation", v)}
          />
          <ToggleField
            label="Показывать примеры"
            description="Примеры использования в Past Simple и Present Perfect."
            checked={settings.showExamples}
            onCheckedChange={(v) => update("showExamples", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Shadowing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Акцент по умолчанию">
            <Select
              value={settings.defaultAccent}
              onValueChange={(v) => update("defaultAccent", v as Settings["defaultAccent"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="british">British English</SelectItem>
                <SelectItem value="american">American English</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Тип голоса">
            <Select
              value={settings.voiceGender}
              onValueChange={(v) => update("voiceGender", v as Settings["voiceGender"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Женский</SelectItem>
                <SelectItem value="male">Мужской</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Используется в обычном Shadowing. Подбираются проверенные голоса Kokoro
              (American: af_sky/am_adam, British: bf_emma/bm_lewis).
            </p>
          </Field>

          <Field label="Скорость речи">
            <Select
              value={settings.defaultSpeed}
              onValueChange={(v) => update("defaultSpeed", v as Settings["defaultSpeed"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Очень медленно</SelectItem>
                <SelectItem value="normal">Учебный темп</SelectItem>
                <SelectItem value="fast">Быстрее</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const { speak, stopSpeaking } = await import("@/lib/speech");
                    stopSpeaking();
                    await speak({
                      text: "write — wrote — written",
                      accent: settings.defaultAccent,
                      speed: settings.defaultSpeed,
                      type: "verb_forms",
                    });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Ошибка озвучки.");
                  }
                }}
              >
                Проверить голос
              </Button>
            </div>
          </Field>

          <Field label="Пауза после диктора (сек)">
            <Select
              value={String(settings.pauseAfterSpeakerSec)}
              onValueChange={(v) =>
                update("pauseAfterSpeakerSec", Number(v) as Settings["pauseAfterSpeakerSec"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Повторить каждую фразу (раз)">
            <Select
              value={String(settings.repeatPhraseCount)}
              onValueChange={(v) =>
                update("repeatPhraseCount", Number(v) as Settings["repeatPhraseCount"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <ToggleField
            label="Предзагрузить следующий глагол"
            description="После успешного воспроизведения тихо подгружает озвучку следующего элемента, чтобы повтор начинался мгновенно."
            checked={settings.prefetchNext}
            onCheckedChange={(v) => update("prefetchNext", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Диагностика озвучки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Раздел для проверки Kokoro-голосов. Не влияет на обычное озвучивание в Shadowing.
          </p>

          <ToggleField
            label="Отключить fallback для проверки"
            description="Если Kokoro не отвечает, не подменять его голосом браузера, а показать реальную ошибку."
            checked={diagNoFallback}
            onCheckedChange={setDiagNoFallback}
          />

          <Field label="Акцент для проверки">
            <Select
              value={diagAccent}
              onValueChange={(v) => setDiagAccent(v as Accent)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="british">British English</SelectItem>
                <SelectItem value="american">American English</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Голос Kokoro (только для диагностики)">
            <Select value={diagVoice} onValueChange={setDiagVoice}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KOKORO_DIAG_VOICES.map((v) => {
                  const accentLabel = v.accent === "british" ? "British" : "American";
                  const genderLabel = v.gender === "female" ? "женский" : "мужской";
                  return (
                    <SelectItem key={v.id} value={v.id}>
                      {v.recommended ? "★ " : ""}
                      {v.label} ({accentLabel}, {genderLabel})
                      {v.note ? ` — ${v.note}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              ★ — рекомендуемые голоса для учебной озвучки.
            </p>
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={diagBusy}
              onClick={async () => {
                setDiagBusy(true);
                setDiagError(null);
                setDiagResult(null);
                try {
                  const { speak, stopSpeaking } = await import("@/lib/speech");
                  stopSpeaking();
                  const res = await speak(
                    {
                      text: DIAG_TEXT,
                      accent: diagAccent,
                      speed: "normal",
                      voiceId: diagVoice,
                      type: "sentence",
                    },
                    { noFallback: diagNoFallback },
                  );
                  setDiagResult(res);
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "Ошибка озвучки.";
                  if (/недоступен|not.*found|unknown.*voice|voice.*invalid|voice_unavailable/i.test(msg)) {
                    setDiagError("Этот голос недоступен на сервере. Выберите другой голос.");
                  } else {
                    setDiagError(msg);
                  }
                } finally {
                  setDiagBusy(false);
                }
              }}
            >
              {diagBusy ? "Проверка…" : "Проверить голос"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={diagBusy}
              onClick={async () => {
                setDiagBusy(true);
                setDiagError(null);
                setDiagResult(null);
                try {
                  const { speak, stopSpeaking } = await import("@/lib/speech");
                  stopSpeaking();
                  const res = await speak(
                    {
                      text: DIAG_TEXT,
                      accent: diagAccent,
                      speed: "normal",
                      voiceId: "am_fenix",
                      type: "sentence",
                    },
                    { noFallback: diagNoFallback },
                  );
                  setDiagResult(res);
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "Ошибка озвучки.";
                  if (/недоступен|voice_unavailable/i.test(msg)) {
                    setDiagError("Этот голос недоступен на сервере. Выберите другой голос.");
                  } else {
                    setDiagError(msg);
                  }
                } finally {
                  setDiagBusy(false);
                }
              }}
            >
              Проверить недоступный голос
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Кнопка «Проверить недоступный голос» намеренно отправляет несуществующий
            voiceId (am_fenix). Ожидаемый результат — ошибка 422 и сообщение о
            недоступности. Если включён «Отключить fallback», браузерный голос не
            должен зазвучать.
          </p>

          {diagError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {diagError}
            </div>
          )}

          {diagResult && (
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1 font-mono">
              <MetaRow
                k="Источник"
                v={
                  diagResult.provider === "browser-speech-synthesis"
                    ? "голос браузера"
                    : `Kokoro (${diagResult.provider})`
                }
              />
              <MetaRow k="Голос" v={diagResult.voiceId ?? "—"} />
              <MetaRow
                k="Акцент"
                v={
                  (diagResult.accent ?? diagAccent) === "british"
                    ? "British English"
                    : "American English"
                }
              />
              <MetaRow
                k="Тип голоса"
                v={(() => {
                  const g = voiceGenderFromId(diagResult.voiceId);
                  return g === "female" ? "женский" : g === "male" ? "мужской" : "—";
                })()}
              />
              <MetaRow k="Content-Type" v={diagResult.contentType ?? "—"} />
              <MetaRow
                k="Размер аудио"
                v={
                  typeof diagResult.audioBytes === "number"
                    ? `${diagResult.audioBytes} bytes`
                    : "—"
                }
              />
              <MetaRow
                k="Playback rate"
                v={
                  diagResult.provider === "browser-speech-synthesis"
                    ? "browser default"
                    : typeof diagResult.playbackRate === "number"
                      ? `${diagResult.playbackRate.toFixed(2)}x (client-side)`
                      : "—"
                }
              />
              <MetaRow k="Кэш" v={diagResult.upstreamCache ?? "—"} />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Если разные Kokoro-голоса звучат одинаково, значит сервер может игнорировать
            параметр voice или использовать fallback-голос.
          </p>
          <p className="text-xs text-muted-foreground">
            Некоторые голоса могут быть недоступны на сервере. В обычном режиме используются
            проверенные голоса.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Резервная копия прогресса</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Сохраните локальный прогресс в файл и восстановите его в другом браузере
            или на другом устройстве. Данные никуда не отправляются.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport}>
              Экспортировать прогресс
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Импортировать прогресс
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFileChosen}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            При импорте текущий прогресс в этом браузере будет заменён данными из файла.
            Глаголы, отсутствующие в текущей базе, безопасно пропускаются.
          </p>
        </CardContent>
      </Card>

      <AlertDialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) setPendingImportText(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Импортировать прогресс?</AlertDialogTitle>
            <AlertDialogDescription>
              Импорт заменит текущий прогресс в этом браузере. Продолжить?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>
              Импортировать
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive">Данные</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Сброс удалит весь прогресс по глаголам, Shadowing и недавние сессии. Это нельзя
            отменить.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Сбросить прогресс</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Сбросить прогресс?</AlertDialogTitle>
                <AlertDialogDescription>
                  Будут удалены все данные о тренировках, Shadowing и сессиях. Настройки
                  сохранятся.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    resetAllProgress();
                    toast.success("Прогресс сброшен.");
                  }}
                >
                  Сбросить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

function MetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right break-all">{v}</span>
    </div>
  );
}



function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
