import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CalendarClock,
  Mic,
  AlertTriangle,
  Layers,
  Dumbbell,
} from "lucide-react";
import { useDueCount, useStats, useWeakIds } from "@/hooks/use-stats";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const stats = useStats();
  const due = useDueCount();
  const weak = useWeakIds().length;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-secondary p-6 md:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-success/25 blur-3xl"
        />
        <div className="relative">
          <Badge className="mb-4 rounded-md bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
            Тренажёр неправильных глаголов
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            Учите неправильные глаголы по&nbsp;паттернам, а&nbsp;не&nbsp;по&nbsp;алфавиту
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Разберите группу, закрепите формы в&nbsp;упражнениях и&nbsp;повторяйте за&nbsp;диктором
            в&nbsp;режиме Shadowing. Прогресс сохраняется автоматически.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/practice">
                Начать тренировку <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/groups">Изучать по группам</Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Общий прогресс</span>
                <span className="font-bold text-primary">{stats.overallPercent}%</span>
              </div>
              <Progress value={stats.overallPercent} />
            </div>
            <Stat label="Изучено глаголов" value={`${stats.learned} / ${stats.total}`} />
            <Stat label="Средняя точность" value={`${stats.accuracy}%`} />
          </div>
        </div>
      </section>

      {/* Action cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <ActionCard
          icon={<CalendarClock className="h-5 w-5" />}
          title="Сегодня к повторению"
          description={
            due > 0
              ? `${due} глаг. ждут повторения по плану интервального повторения.`
              : "Сегодня нет глаголов к повторению. Можно изучать новые."
          }
          action={
            <Button asChild variant="secondary" className="w-full">
              <Link to="/practice" search={{ scope: "due" }}>
                Повторить
              </Link>
            </Button>
          }
        />
        <ActionCard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Слабые глаголы"
          description={
            weak > 0
              ? `${weak} глаг. требуют дополнительной тренировки.`
              : "Слабых глаголов пока нет — отличная работа."
          }
          action={
            <Button asChild variant="secondary" className="w-full">
              <Link to="/weak">Открыть</Link>
            </Button>
          }
        />
        <ActionCard
          icon={<Mic className="h-5 w-5" />}
          title="Shadowing"
          description="Слушайте и повторяйте за диктором — для произношения и автоматизма."
          action={
            <Button asChild variant="secondary" className="w-full">
              <Link to="/shadowing">К Shadowing</Link>
            </Button>
          }
        />
      </section>


      {/* Method */}
      <section className="grid gap-4 md:grid-cols-3">
        <MethodCard
          icon={<Layers className="h-5 w-5" />}
          title="Группы и паттерны"
          text="Глаголы сгруппированы по форме и звуку: A–B–B, i–a–u, -ought / -aught и др."
        />
        <MethodCard
          icon={<Dumbbell className="h-5 w-5" />}
          title="Активное вспоминание"
          text="5 типов упражнений: пропуски форм, выбор, перевод и быстрая самопроверка."
        />
        <MethodCard
          icon={<Mic className="h-5 w-5" />}
          title="Shadowing"
          text="Повторение за диктором: формы, фразы и групповой ритм. British / American."
        />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}


function MethodCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="font-semibold">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
