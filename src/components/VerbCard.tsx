import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Verb } from "@/lib/types";
import { GROUP_BY_ID } from "@/lib/data/groups";
import { useSettings } from "@/hooks/use-storage";

export function VerbCard({ verb }: { verb: Verb }) {
  const group = GROUP_BY_ID[verb.groupId];
  const settings = useSettings();
  const showTranslation = settings.showTranslation;
  const showExamples = settings.showExamples;
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-base font-semibold">
              {verb.infinitive} — {verb.pastSimple} — {verb.pastParticiple}
              {verb.alternativePastParticiple?.length
                ? ` / ${verb.alternativePastParticiple.join(", ")}`
                : ""}
            </div>
            {showTranslation && (
              <div className="mt-1 text-sm text-muted-foreground">{verb.translation}</div>
            )}
          </div>
          {group && (
            <Badge variant="secondary" className="shrink-0">
              {group.title}
            </Badge>
          )}
        </div>

        {showExamples && (
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Past Simple · </span>
              <span>{verb.examples.pastSimple}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Present Perfect · </span>
              <span>{verb.examples.presentPerfect}</span>
            </div>
            {verb.examples.passive && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Passive · </span>
                <span>{verb.examples.passive}</span>
              </div>
            )}
          </div>
        )}

        {verb.hint && (
          <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
            Подсказка: {verb.hint}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-1">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to="/practice" search={{ scope: "single", verbId: verb.id }}>
              Тренировать
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link to="/shadowing" search={{ verbId: verb.id }}>
              Shadowing
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
