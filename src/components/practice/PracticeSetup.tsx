import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
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
import { VERB_GROUPS } from "@/lib/data/groups";
import { useProgress, useSettings } from "@/hooks/use-storage";
import { pickPool } from "@/lib/practice/generation";
import {
  MODE_LABEL,
  PRACTICE_MODES,
  PRACTICE_SCOPES,
  QUESTION_COUNT_OPTIONS,
  SCOPE_LABEL,
  type PracticeMode,
  type PracticeScope,
} from "@/lib/practice/types";
import { cn } from "@/lib/utils";

export type PracticeSetupValues = {
  scope: PracticeScope;
  groupId: string;
  verbId?: string;
  count: number;
  mode: PracticeMode;
};

export function PracticeSetup({
  initial,
  forceSingleVerbId,
  onStart,
}: {
  initial: Partial<PracticeSetupValues>;
  forceSingleVerbId?: string;
  onStart: (values: PracticeSetupValues) => void;
}) {
  // useSettings subscribes to storage so toggling defaults in /settings
  // reflects here without a remount.
  const settings = useSettings();
  const [scope, setScope] = useState<PracticeScope>(initial.scope ?? "all");
  const [groupId, setGroupId] = useState<string>(initial.groupId ?? VERB_GROUPS[0].id);
  const [count, setCount] = useState<number>(initial.count ?? settings.defaultQuestionCount);
  const [mode, setMode] = useState<PracticeMode>(initial.mode ?? "auto");

  // If we arrived with a `single` scope + verbId, lock to 1 question.
  useEffect(() => {
    if (forceSingleVerbId) {
      setScope("single");
      setCount(1);
    }
  }, [forceSingleVerbId]);

  const visibleScopes = PRACTICE_SCOPES.filter((s) => s !== "single");

  // Pool size for the currently-selected scope — surfaces "0 глаголов"
  // before the user starts, so empty scopes (no weak, no due, empty
  // group) don't surprise them on the runner screen. The progress dep
  // makes the badge re-evaluate when a finished session promotes /
  // demotes verbs in storage.
  const progress = useProgress();
  const poolSize = useMemo(
    () => pickPool(scope, scope === "group" ? groupId : undefined).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pickPool reads `progress` internally
    [scope, groupId, progress],
  );
  const startDisabled = poolSize === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Тренировка</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Выберите набор и тип задания. Прогресс сохранится автоматически.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Что тренировать</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="practice-scope" className="text-xs text-muted-foreground">
                Набор
              </Label>
              <Badge variant={poolSize === 0 ? "destructive" : "secondary"} className="text-[10px]">
                {poolSize === 0
                  ? "пусто"
                  : poolSize === 1
                    ? "1 глагол"
                    : poolSize < 5
                      ? `${poolSize} глагола`
                      : `${poolSize} глаголов`}
              </Badge>
            </div>
            <Select value={scope} onValueChange={(v) => setScope(v as PracticeScope)}>
              <SelectTrigger id="practice-scope">
                <SelectValue placeholder="Выберите набор" />
              </SelectTrigger>
              <SelectContent>
                {visibleScopes.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SCOPE_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {startDisabled && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {scope === "weak"
                  ? "Пока нет сложных глаголов — отметьте трудные в тренировке."
                  : scope === "due"
                    ? "Сегодня нет глаголов к повторению. Возьмите «Все»."
                    : scope === "new"
                      ? "Все глаголы уже встречались — попробуйте «Все»."
                      : "В этом наборе нет глаголов."}
              </p>
            )}
          </div>

          {scope === "group" && (
            <div>
              <Label htmlFor="practice-group" className="text-xs text-muted-foreground">
                Группа
              </Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger id="practice-group" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VERB_GROUPS.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.title} — {g.subtitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <div id="practice-count-label" className="text-xs text-muted-foreground">
              Количество вопросов
            </div>
            <div
              className="mt-1.5 grid grid-cols-4 gap-2"
              role="group"
              aria-labelledby="practice-count-label"
            >
              {QUESTION_COUNT_OPTIONS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={count === n ? "default" : "outline"}
                  onClick={() => setCount(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div id="practice-mode-label" className="text-xs text-muted-foreground">
              Тип упражнения
            </div>
            <div className="mt-1.5 grid gap-2" role="group" aria-labelledby="practice-mode-label">
              {PRACTICE_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                    mode === m
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-secondary/60",
                  )}
                >
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={startDisabled}
            onClick={() => onStart({ scope, groupId, verbId: forceSingleVerbId, count, mode })}
          >
            Начать тренировку <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
