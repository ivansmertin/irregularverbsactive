import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PracticeSetup, type PracticeSetupValues } from "@/components/practice/PracticeSetup";
import { PracticeRunner } from "@/components/practice/PracticeRunner";
import {
  isPracticeMode,
  isPracticeScope,
  type PracticeMode,
  type PracticeScope,
} from "@/lib/practice/types";

type PracticeSearch = {
  scope?: PracticeScope;
  groupId?: string;
  verbId?: string;
  count?: number;
  mode?: PracticeMode;
};

export const Route = createFileRoute("/practice")({
  validateSearch: (s: Record<string, unknown>): PracticeSearch => ({
    scope: isPracticeScope(s.scope) ? s.scope : undefined,
    groupId: typeof s.groupId === "string" ? s.groupId : undefined,
    verbId: typeof s.verbId === "string" ? s.verbId : undefined,
    count: typeof s.count === "number" ? s.count : undefined,
    mode: isPracticeMode(s.mode) ? s.mode : undefined,
  }),
  component: PracticePage,
});

function PracticePage() {
  const search = Route.useSearch();
  const [run, setRun] = useState<PracticeSetupValues | null>(null);

  if (run) {
    return (
      <PracticeRunner
        scope={run.scope}
        groupId={run.groupId}
        verbId={run.verbId}
        count={run.count}
        mode={run.mode}
        onExit={() => setRun(null)}
      />
    );
  }

  return (
    <PracticeSetup
      initial={{
        scope: search.scope,
        groupId: search.groupId,
        count: search.count,
        mode: search.mode,
      }}
      forceSingleVerbId={search.scope === "single" && search.verbId ? search.verbId : undefined}
      onStart={(values) => setRun(values)}
    />
  );
}
