import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VERBS_BY_ID } from "@/lib/data/verbs";
import { useWeakIds } from "@/hooks/use-stats";
import { GROUP_BY_ID } from "@/lib/data/groups";

export const Route = createFileRoute("/weak")({
  component: WeakPage,
});

function WeakPage() {
  const ids = useWeakIds();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">Сложные глаголы</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Глаголы, которые стоит повторить отдельно.
          </p>
        </div>
        {ids.length > 0 && (
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/practice" search={{ scope: "weak" }}>
                Тренировать сложные
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/shadowing" search={{ mode: "weak" }}>
                Shadowing сложных
              </Link>
            </Button>
          </div>
        )}
      </header>

      {ids.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Сложных глаголов пока нет. Продолжайте практиковаться — они появятся автоматически.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {ids.map((id) => {
            const v = VERBS_BY_ID[id];
            if (!v) return null;
            const group = GROUP_BY_ID[v.groupId];
            return (
              <Card key={id}>
                <CardContent className="flex items-center justify-between gap-3 pt-6">
                  <div>
                    <div className="font-mono font-medium">
                      {v.infinitive} — {v.pastSimple} — {v.pastParticiple}
                    </div>
                    <div className="text-sm text-muted-foreground">{v.translation}</div>
                  </div>
                  {group && <Badge variant="secondary">{group.title}</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
