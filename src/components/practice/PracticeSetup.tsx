import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VERB_GROUPS } from "@/lib/data/groups";
import { getSettings } from "@/lib/storage";
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
  const settings = useMemo(() => getSettings(), []);
  const [scope, setScope] = useState<PracticeScope>(initial.scope ?? "all");
  const [groupId, setGroupId] = useState<string>(
    initial.groupId ?? VERB_GROUPS[0].id,
  );
  const [count, setCount] = useState<number>(
    initial.count ?? settings.defaultQuestionCount,
  );
  const [mode, setMode] = useState<PracticeMode>(initial.mode ?? "auto");

  // If we arrived with a `single` scope + verbId, lock to 1 question.
  useEffect(() => {
    if (forceSingleVerbId) {
      setScope("single");
      setCount(1);
    }
  }, [forceSingleVerbId]);

  const visibleScopes = PRACTICE_SCOPES.filter((s) => s !== "single");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Тренировка</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Выберите, что и как тренировать. Ответы проверяются автоматически, а прогресс
          сохраняется.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Что тренировать</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Набор
            </Label>
            <Select value={scope} onValueChange={(v) => setScope(v as PracticeScope)}>
              <SelectTrigger className="mt-1.5">
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
          </div>

          {scope === "group" && (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Группа
              </Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger className="mt-1.5">
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
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Количество вопросов
            </Label>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
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
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Тип упражнения
            </Label>
            <div className="mt-1.5 grid gap-2">
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
            onClick={() =>
              onStart({ scope, groupId, verbId: forceSingleVerbId, count, mode })
            }
          >
            Начать тренировку <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
