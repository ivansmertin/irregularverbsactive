import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GROUP_BY_ID } from "@/lib/data/groups";
import { VERBS_BY_GROUP } from "@/lib/data/verbs";
import { VerbCard } from "@/components/VerbCard";
import { useSettings } from "@/hooks/use-storage";

export const Route = createFileRoute("/groups/$groupId")({
  component: GroupDetail,
  loader: ({ params }) => {
    const group = GROUP_BY_ID[params.groupId];
    if (!group) throw notFound();
    return { group };
  },
});

function GroupDetail() {
  const { group } = Route.useLoaderData();
  const verbs = VERBS_BY_GROUP[group.id] ?? [];
  const settings = useSettings();
  const showTranslation = settings.showTranslation;


  return (
    <div className="space-y-6">
      <header>
        <Link to="/groups" className="text-xs text-muted-foreground hover:underline">
          ← Все группы
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <Badge variant="secondary" className="mb-2">
              {group.patternType === "sound" ? "Звуковой паттерн" : "Форма"}
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{group.title}</h1>
            <p className="mt-1 text-muted-foreground">{group.subtitle}</p>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-muted-foreground md:text-base">
          {group.description}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/practice" search={{ scope: "group", groupId: group.id }}>
              Тренировать группу
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/shadowing" search={{ groupId: group.id }}>
              Shadowing по группе
            </Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Инфинитив</TableHead>
                  <TableHead>Past Simple</TableHead>
                  <TableHead>Past Participle</TableHead>
                  {showTranslation && <TableHead>Перевод</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {verbs.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.infinitive}</TableCell>
                    <TableCell className="font-mono">{v.pastSimple}</TableCell>
                    <TableCell className="font-mono">
                      {v.pastParticiple}
                      {v.alternativePastParticiple?.length
                        ? ` / ${v.alternativePastParticiple.join(", ")}`
                        : ""}
                    </TableCell>
                    {showTranslation && (
                      <TableCell className="text-muted-foreground">{v.translation}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Карточки глаголов</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {verbs.map((v) => (
            <VerbCard key={v.id} verb={v} />
          ))}
        </div>
      </section>
    </div>
  );
}
