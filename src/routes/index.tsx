import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowRight, BarChart3, CalendarClock, Dumbbell, Mic, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useProgress, useSessions, useShadowing } from "@/hooks/use-storage";
import type { UserVerbProgress } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function isDueToday(progress: UserVerbProgress): boolean {
  if (!progress.nextReviewAt) return false;
  const next = new Date(progress.nextReviewAt).getTime();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return Number.isFinite(next) && next <= endOfToday.getTime();
}

function pluralVerb(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "глагол";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "глагола";
  return "глаголов";
}

function HomePage() {
  const progress = useProgress();
  const shadowing = useShadowing();
  const sessions = useSessions();

  const progressList = Object.values(progress);
  const touched = progressList.length;
  const due = progressList.filter(isDueToday).length;
  const hard = progressList.filter((item) => item.isWeak).length;
  const totalAnswers = progressList.reduce(
    (sum, item) => sum + item.correctCount + item.wrongCount,
    0,
  );
  const correctAnswers = progressList.reduce((sum, item) => sum + item.correctCount, 0);
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
  const shadowingDone = Object.values(shadowing).reduce(
    (sum, item) => sum + item.shadowingCount,
    0,
  );
  const lastSession = sessions[0];

  return (
    <div className="space-y-5">
      <section className="rounded-md border bg-card p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-3">
              Irregular Verbs Trainer
            </Badge>
            <h1 className="text-2xl font-semibold md:text-3xl">Что тренируем сегодня?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Быстрый обзор прогресса и следующий шаг без лишней подготовки.
            </p>
          </div>
          <PrimaryAction due={due} hard={hard} touched={touched} />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Сводка прогресса">
        <Metric label="В работе" value={String(touched)} hint="глаголов уже встречались" />
        <Metric
          label="Точность"
          value={totalAnswers > 0 ? `${accuracy}%` : "—"}
          hint={totalAnswers > 0 ? `${totalAnswers} ответов` : "пока нет ответов"}
        />
        <Metric label="Shadowing" value={String(shadowingDone)} hint="повторений вслух" />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <ActionCard
          icon={<CalendarClock className="h-5 w-5" />}
          title="На сегодня"
          description={
            due > 0 ? `${due} ${pluralVerb(due)} пора повторить` : "Запланированных повторений нет"
          }
          action={
            <Button asChild variant={due > 0 ? "default" : "secondary"} className="w-full">
              <Link to="/practice" search={{ scope: due > 0 ? "due" : "all" }}>
                {due > 0 ? "Повторить" : "Тренировать всё"}
              </Link>
            </Button>
          }
        />
        <ActionCard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Сложные"
          description={
            hard > 0 ? `${hard} ${pluralVerb(hard)} требуют внимания` : "Сложных глаголов пока нет"
          }
          action={
            <Button asChild variant="secondary" className="w-full">
              <Link to={hard > 0 ? "/weak" : "/practice"} search={hard > 0 ? {} : { scope: "all" }}>
                {hard > 0 ? "Открыть" : "Начать"}
              </Link>
            </Button>
          }
        />
        <ActionCard
          icon={<Mic className="h-5 w-5" />}
          title="Shadowing"
          description="Формы и фразы с браузерным голосом"
          action={
            <Button asChild variant="secondary" className="w-full">
              <Link to="/shadowing">Практиковать</Link>
            </Button>
          }
        />
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" /> Последняя тренировка
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lastSession ? (
            <>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{lastSession.mode}</span>
                <span className="text-muted-foreground">
                  {new Date(lastSession.startedAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
              <Progress
                value={Math.round((lastSession.correct / Math.max(lastSession.total, 1)) * 100)}
                aria-label="Результат последней тренировки"
                aria-valuetext={`${lastSession.correct} из ${lastSession.total}`}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Завершённых тренировок пока нет</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PrimaryAction({ due, hard, touched }: { due: number; hard: number; touched: number }) {
  if (due > 0) {
    return (
      <Button asChild size="lg" className="w-full md:w-auto">
        <Link to="/practice" search={{ scope: "due" }}>
          Начать тренировку <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    );
  }
  if (hard > 0) {
    return (
      <Button asChild size="lg" className="w-full md:w-auto">
        <Link to="/practice" search={{ scope: "weak" }}>
          Начать тренировку <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    );
  }
  return (
    <Button asChild size="lg" className="w-full md:w-auto">
      <Link to="/practice" search={{ scope: touched > 0 ? "all" : "new" }}>
        Начать тренировку <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          {icon}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
