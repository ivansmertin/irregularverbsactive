import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
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
import { useSettings } from "@/hooks/use-storage";
import { BackupShapeError, downloadBackup, importBackupFromString } from "@/lib/backup";
import { resetAllProgress, saveSettings } from "@/lib/storage";
import type { Settings } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useSettings();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImportText, setPendingImportText] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [voiceTestBusy, setVoiceTestBusy] = useState(false);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    saveSettings({ ...settings, [key]: value });
  }

  function handleExport() {
    try {
      downloadBackup();
      toast.success("Прогресс экспортирован.");
    } catch {
      toast.error("Не удалось экспортировать прогресс.");
    }
  }

  function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
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
        toast.message("Часть данных пропущена: некоторые глаголы не найдены в текущей базе.", {
          description: `Пропущено идентификаторов: ${res.skippedUnknownVerbs.length}.`,
        });
      }
    } catch (err) {
      setPendingImportText(null);
      setImportOpen(false);
      toast.error(
        err instanceof BackupShapeError ? err.message : "Не удалось импортировать прогресс.",
      );
    }
  }

  async function testVoice() {
    setVoiceTestBusy(true);
    try {
      const { isSpeechAvailable, speak, stopSpeaking } = await import("@/lib/speech");
      if (!isSpeechAvailable()) {
        throw new Error("Голос недоступен. Попробуйте Chrome, Edge или Safari.");
      }
      stopSpeaking();
      await speak({
        text: "write - wrote - written",
        accent: settings.defaultAccent,
        speed: settings.defaultSpeed,
        type: "verb_forms",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка озвучки.");
    } finally {
      setVoiceTestBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Настройки</h1>
        <p className="mt-1 text-sm text-muted-foreground">Параметры сохраняются в этом браузере.</p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Тренировки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="settings-question-count" label="Количество вопросов по умолчанию">
            <Select
              value={String(settings.defaultQuestionCount)}
              onValueChange={(v) =>
                update("defaultQuestionCount", Number(v) as Settings["defaultQuestionCount"])
              }
            >
              <SelectTrigger id="settings-question-count">
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

          <Field id="settings-difficulty" label="Сложность">
            <Select
              value={settings.difficulty}
              onValueChange={(v) => update("difficulty", v as Settings["difficulty"])}
            >
              <SelectTrigger id="settings-difficulty">
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
            id="settings-show-translation"
            label="Показывать перевод"
            description="Перевод глагола в карточках и упражнениях."
            checked={settings.showTranslation}
            onCheckedChange={(v) => update("showTranslation", v)}
          />
          <ToggleField
            id="settings-show-examples"
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
          <Field id="settings-accent" label="Акцент по умолчанию">
            <Select
              value={settings.defaultAccent}
              onValueChange={(v) => update("defaultAccent", v as Settings["defaultAccent"])}
            >
              <SelectTrigger id="settings-accent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="british">British English</SelectItem>
                <SelectItem value="american">American English</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field id="settings-speed" label="Скорость речи">
            <Select
              value={settings.defaultSpeed}
              onValueChange={(v) => update("defaultSpeed", v as Settings["defaultSpeed"])}
            >
              <SelectTrigger id="settings-speed">
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
                disabled={voiceTestBusy}
                onClick={testVoice}
              >
                {voiceTestBusy ? "Проверка..." : "Проверить голос"}
              </Button>
            </div>
          </Field>

          <Field id="settings-pause" label="Пауза после диктора (сек)">
            <Select
              value={String(settings.pauseAfterSpeakerSec)}
              onValueChange={(v) =>
                update("pauseAfterSpeakerSec", Number(v) as Settings["pauseAfterSpeakerSec"])
              }
            >
              <SelectTrigger id="settings-pause">
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

          <Field id="settings-repeat" label="Повторить каждую фразу (раз)">
            <Select
              value={String(settings.repeatPhraseCount)}
              onValueChange={(v) =>
                update("repeatPhraseCount", Number(v) as Settings["repeatPhraseCount"])
              }
            >
              <SelectTrigger id="settings-repeat">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Резервная копия прогресса</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Сохраните прогресс в файл или восстановите его на другом устройстве.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport}>
              Экспортировать прогресс
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
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
            При импорте текущий прогресс в этом браузере будет заменён данными из файла. Глаголы,
            отсутствующие в текущей базе, безопасно пропускаются.
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
            <AlertDialogAction onClick={confirmImport}>Импортировать</AlertDialogAction>
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
                  Будут удалены все данные о тренировках, Shadowing и сессиях. Настройки сохранятся.
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

function Field({ id, label, children }: { id?: string; label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ToggleField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div>
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
