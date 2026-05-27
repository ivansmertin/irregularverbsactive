import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { VERB_GROUPS } from "@/lib/data/groups";
import { VERBS_BY_GROUP } from "@/lib/data/verbs";
import { useGroupProgress } from "@/hooks/use-stats";
import type { VerbGroup } from "@/lib/types";

export const Route = createFileRoute("/groups/")({
  component: GroupsPage,
});

function GroupsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Группы глаголов</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Каждая группа объединена общим паттерном — формой или звучанием. Начните с любой и
          постепенно закрепляйте её в&nbsp;упражнениях.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {VERB_GROUPS.map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}
      </div>
    </div>
  );
}

function GroupCard({ group: g }: { group: VerbGroup }) {
  const verbs = VERBS_BY_GROUP[g.id] ?? [];
  const stats = useGroupProgress(g.id);
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="secondary" className="mb-2">
              {g.patternType === "sound" ? "Звуковой паттерн" : "Форма"}
            </Badge>
            <CardTitle className="text-xl">{g.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{g.subtitle}</p>
          </div>
          <div className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
            {verbs.length} глаг.
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-sm text-muted-foreground">{g.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {g.examples.slice(0, 5).map((ex) => (
            <span key={ex} className="rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-xs">
              {ex}
            </span>
          ))}
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Прогресс по группе</span>
            <span className="font-medium">{stats.percent}%</span>
          </div>
          <Progress
            value={stats.percent}
            aria-label={`Прогресс группы ${g.title}`}
            aria-valuetext={`${stats.percent}%`}
          />
        </div>
        <div className="mt-auto flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link to="/groups/$groupId" params={{ groupId: g.id }}>
              Изучать
            </Link>
          </Button>
          <Button asChild className="flex-1">
            <Link to="/practice" search={{ scope: "group", groupId: g.id }}>
              Тренировать
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
