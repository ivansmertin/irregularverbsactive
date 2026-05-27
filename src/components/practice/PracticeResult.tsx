import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, RotateCcw, Settings2 } from "lucide-react";

export type SessionMistake = {
  verbId: string;
  infinitive: string;
  translation: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
};

export function PracticeResult({
  total,
  correct,
  almost,
  wrong,
  mistakes,
  onExit,
  onRestart,
  onRetryMistakes,
}: {
  total: number;
  correct: number;
  almost: number;
  wrong: number;
  mistakes: SessionMistake[];
  onExit: () => void;
  onRestart: () => void;
  onRetryMistakes?: () => void;
}) {
  const weightedCorrect = correct + almost * 0.5;
  const percent = total > 0 ? Math.round((weightedCorrect / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6 text-center">
          <h2 className="text-xl font-semibold">Тренировка завершена</h2>
          <div className="text-4xl font-semibold">
            {correct} / {total}
          </div>
          <div className="text-sm text-muted-foreground">
            Правильно: {correct}
            {almost > 0 && <> · Частично: {almost}</>} · Ошибок: {wrong}
          </div>
          <div className="text-muted-foreground">Точность: {percent}%</div>
          <Progress
            value={percent}
            aria-label="Итоговая точность тренировки"
            aria-valuetext={`${percent}%`}
          />
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button variant="outline" onClick={onExit}>
              <Settings2 className="mr-2 h-4 w-4" /> Настроить заново
            </Button>
            <Button variant="secondary" onClick={onRestart}>
              <RotateCcw className="mr-2 h-4 w-4" /> Повторить
            </Button>
            {onRetryMistakes && (
              <Button onClick={onRetryMistakes}>
                <RefreshCw className="mr-2 h-4 w-4" /> Повторить ошибки
                <span className="ml-1 opacity-80">({mistakes.length})</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {mistakes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Разбор ошибок</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mistakes.map((m, i) => (
              <div key={`${m.verbId}-${i}`} className="rounded-md border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-mono text-base">{m.infinitive}</div>
                  <div className="text-xs text-muted-foreground">{m.translation}</div>
                </div>
                <Separator className="my-2" />
                <div className="grid gap-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Ваш ответ: </span>
                    <span className="font-mono text-red-700">{m.userAnswer}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Правильно: </span>
                    <span className="font-mono text-emerald-700">{m.correctAnswer}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.explanation}</p>
                </div>
                <div className="mt-3 text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/practice" search={{ scope: "single", verbId: m.verbId, count: 1 }}>
                      Повторить этот глагол
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
