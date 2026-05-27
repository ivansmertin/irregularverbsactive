import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VERBS_BY_ID } from "@/lib/data/verbs";
import { getSettings } from "@/lib/storage";
import { buildModeSequence, buildQuestionList } from "@/lib/practice/generation";
import { recordPracticeSession } from "@/lib/practice/session";
import {
  MODE_LABEL,
  type Difficulty,
  type PracticeMode,
  type PracticeScope,
} from "@/lib/practice/types";
import type { Verb } from "@/lib/types";
import { QuestionRenderer, type AnswerDetail } from "./QuestionRenderer";
import { PracticeResult, type SessionMistake } from "./PracticeResult";

export function PracticeRunner({
  scope,
  groupId,
  verbId,
  count,
  mode,
  customVerbIds,
  onExit,
}: {
  scope: PracticeScope;
  groupId?: string;
  verbId?: string;
  count: number;
  mode: PracticeMode;
  customVerbIds?: string[];
  onExit: () => void;
}) {
  const settings = useMemo(() => getSettings(), []);
  const difficulty: Difficulty = settings.difficulty;

  // Allow caller-supplied verb list (used for "Повторить ошибки").
  const [override, setOverride] = useState<string[] | undefined>(customVerbIds);

  const questions: Verb[] = useMemo(() => {
    if (override && override.length > 0) {
      const list = override.map((id) => VERBS_BY_ID[id]).filter(Boolean) as Verb[];
      return list;
    }
    return buildQuestionList(scope, groupId, verbId, count);
  }, [override, scope, groupId, verbId, count]);

  const modes = useMemo(
    () => buildModeSequence(questions.length, mode, difficulty),
    [questions.length, mode, difficulty],
  );

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<AnswerDetail & { verb: Verb; mode: PracticeMode }>>(
    [],
  );
  const [done, setDone] = useState(false);

  const total = questions.length;
  const verb = questions[index];
  const currentMode = modes[index] ?? "fill";

  const correctCount = answers.filter((a) => a.result === "correct").length;
  const almostCount = answers.filter((a) => a.result === "almost").length;
  const wrongCount = answers.filter((a) => a.result === "wrong").length;
  const answeredCount = answers.length;
  const liveAccuracy =
    answeredCount > 0 ? Math.round(((correctCount + almostCount * 0.5) / answeredCount) * 100) : 0;

  function resetSession(newOverride?: string[]) {
    setOverride(newOverride);
    setIndex(0);
    setAnswers([]);
    setDone(false);
  }

  function handleResult(detail: AnswerDetail) {
    setAnswers((prev) => [...prev, { ...detail, verb, mode: currentMode }]);
  }

  function next() {
    if (index + 1 >= total) {
      // Persist raw counts, never the weighted/rounded score. The progress
      // page recomputes accuracy from these so what the user sees on the
      // result screen matches what they later see in history.
      recordPracticeSession({
        total,
        correct: correctCount,
        almost: almostCount,
        wrong: wrongCount,
        modeLabel: MODE_LABEL[mode],
      });
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (total === 0) {
    const emptyMessage =
      scope === "weak"
        ? "Слабых глаголов пока нет — отметьте трудные в тренировке или Shadowing, и они появятся здесь."
        : scope === "due"
          ? "Сегодня нет глаголов к повторению. Возьмите «Все» или «Новые»."
          : scope === "new"
            ? "Все глаголы уже встречались. Попробуйте «Все» или «Слабые»."
            : scope === "group"
              ? "В этой группе пока нет глаголов."
              : scope === "single"
                ? "Глагол не найден. Возможно, ссылка устарела."
                : "В выбранном наборе нет глаголов.";
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{emptyMessage}</p>
            <Button className="mt-4" onClick={onExit}>
              Изменить настройки
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    const mistakes: SessionMistake[] = answers
      .filter((a) => a.result === "wrong")
      .map((a) => ({
        verbId: a.verb.id,
        infinitive: a.verb.infinitive,
        translation: a.verb.translation,
        userAnswer: a.userAnswer,
        correctAnswer: a.correctAnswer,
        explanation: a.explanation,
      }));
    return (
      <PracticeResult
        total={total}
        correct={correctCount}
        almost={almostCount}
        wrong={wrongCount}
        mistakes={mistakes}
        onExit={onExit}
        onRestart={() => resetSession(undefined)}
        onRetryMistakes={
          mistakes.length > 0 ? () => resetSession(mistakes.map((m) => m.verbId)) : undefined
        }
      />
    );
  }

  const progressValue = total > 0 ? (index / total) * 100 : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="secondary">{MODE_LABEL[currentMode]}</Badge>
        <div className="text-sm text-muted-foreground">
          Вопрос {index + 1} из {total}
          {answeredCount > 0 && <span className="ml-2">· Точность {liveAccuracy}%</span>}
        </div>
      </div>
      <Progress value={progressValue} />

      <QuestionRenderer
        key={verb.id + index + currentMode}
        verb={verb}
        mode={currentMode}
        difficulty={difficulty}
        showTranslation={settings.showTranslation}
        onResult={handleResult}
        onNext={next}
      />

      <div className="text-center">
        <button className="text-xs text-muted-foreground hover:underline" onClick={onExit}>
          Завершить тренировку
        </button>
      </div>
    </div>
  );
}
