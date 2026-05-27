import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Grid2X2, List } from "lucide-react";
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
});

function GroupDetail() {
  const { groupId } = Route.useParams();
  const group = GROUP_BY_ID[groupId];
  if (!group) throw notFound();
  const verbs = VERBS_BY_GROUP[group.id] ?? [];
  const settings = useSettings();
  const showTranslation = settings.showTranslation;
  const [view, setView] = useState<"list" | "cards">("list");

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
            <h1 className="text-2xl font-semibold md:text-3xl">{group.title}</h1>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Глаголы группы</h2>
        <div className="inline-flex rounded-md border bg-background p-1" aria-label="Вид списка">
          <Button
            type="button"
            size="sm"
            variant={view === "list" ? "secondary" : "ghost"}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List className="mr-2 h-4 w-4" /> Список
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "cards" ? "secondary" : "ghost"}
            aria-pressed={view === "cards"}
            onClick={() => setView("cards")}
          >
            <Grid2X2 className="mr-2 h-4 w-4" /> Карточки
          </Button>
        </div>
      </div>

      {view === "list" ? (
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {verbs.map((v) => (
            <VerbCard key={v.id} verb={v} />
          ))}
        </div>
      )}
    </div>
  );
}
