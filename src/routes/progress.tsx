import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { VERB_GROUPS } from "@/lib/data/groups";
import { useStats, useGroupProgress } from "@/hooks/use-stats";
import { useSessions } from "@/hooks/use-storage";
import { computeAccuracyPercent } from "@/lib/practice/session";

export const Route = createFileRoute("/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const stats = useStats();
  const sessions = useSessions();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Прогресс</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Сводка по изучению глаголов, точности и Shadowing.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Всего глаголов" value={stats.total.toString()} />
        <Stat label="Изучается" value={stats.touched.toString()} />
        <Stat label="Освоено" value={stats.mastered.toString()} />
        <Stat label="Сложных" value={stats.weak.toString()} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Общий прогресс</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row
            label="Уровень освоения"
            value={`${stats.overallPercent}%`}
            percent={stats.overallPercent}
          />
          <Row
            label="Средняя точность ответов"
            value={`${stats.accuracy}%`}
            percent={stats.accuracy}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Прогресс по группам</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {VERB_GROUPS.map((g) => (
            <GroupRow key={g.id} groupId={g.id} title={g.title} subtitle={g.subtitle} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Shadowing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Stat label="Повторений всего" value={stats.shadowingDone.toString()} />
          <Stat label="Сложных для Shadowing" value={stats.shadowingWeak.toString()} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Недавние тренировки</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет завершённых сессий.</p>
          ) : (
            <ul className="divide-y">
              {sessions.slice(0, 10).map((s) => {
                const pct = computeAccuracyPercent(s.correct, s.total, s.almost ?? 0);
                const label =
                  s.almost && s.almost > 0
                    ? `${s.correct}+${s.almost}/${s.total}`
                    : `${s.correct}/${s.total}`;
                return (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div className="font-medium">{s.mode}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.startedAt).toLocaleString("ru-RU")}
                      </div>
                    </div>
                    <Badge variant={pct >= 70 ? "default" : "secondary"}>
                      {label} · {pct}%
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Row({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <Progress value={percent} aria-label={label} aria-valuetext={`${value}`} />
    </div>
  );
}

function GroupRow({
  groupId,
  title,
  subtitle,
}: {
  groupId: string;
  title: string;
  subtitle: string;
}) {
  const p = useGroupProgress(groupId);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {p.mastered}/{p.count} · {p.percent}%
        </span>
      </div>
      <Progress
        value={p.percent}
        aria-label={`Прогресс группы ${title}`}
        aria-valuetext={`${p.mastered} из ${p.count}, ${p.percent}%`}
      />
    </div>
  );
}
