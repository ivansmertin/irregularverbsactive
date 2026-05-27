// Memoised derived selectors over the reactive storage hooks. Every
// consumer of these gets the same recomputed value as long as the
// underlying progress / shadowing snapshot is unchanged — and gets the
// new value automatically when storage is written.

import { useMemo } from "react";

import { VERBS } from "@/lib/data/verbs";
import { isDueToday } from "@/lib/progress";

import { useProgress, useShadowing } from "./use-storage";

export type AppStats = {
  total: number;
  touched: number;
  learned: number;
  mastered: number;
  weak: number;
  accuracy: number;
  overallPercent: number;
  shadowingDone: number;
  shadowingWeak: number;
};

export function useStats(): AppStats {
  const progress = useProgress();
  const shadowing = useShadowing();
  return useMemo(() => {
    const total = VERBS.length;
    let touched = 0;
    let mastered = 0;
    let weak = 0;
    let learned = 0;
    let totalAnswers = 0;
    let totalCorrect = 0;
    let masterySum = 0;

    // Iterate only over verbs the user has interacted with rather than the
    // entire VERBS array. On a fresh start (10 out of 120+ verbs) this cuts
    // the number of iterations significantly.
    const entries = Object.values(progress);
    for (const p of entries) {
      touched += 1;
      totalAnswers += p.correctCount + p.wrongCount;
      totalCorrect += p.correctCount;
      const m = p.masteryLevel ?? 0;
      masterySum += m;
      if (m >= 5) mastered += 1;
      if (m >= 2) learned += 1;
      if (p.isWeak) weak += 1;
    }

    const accuracy =
      totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
    const shadowingDone = Object.values(shadowing).reduce(
      (s, x) => s + x.shadowingCount,
      0,
    );
    const shadowingWeak = Object.values(shadowing).filter(
      (x) => x.isWeakForShadowing,
    ).length;
    return {
      total,
      touched,
      learned,
      mastered,
      weak,
      accuracy,
      overallPercent: Math.round((masterySum / (total * 5)) * 100),
      shadowingDone,
      shadowingWeak,
    };
  }, [progress, shadowing]);
}

export function useDueCount(): number {
  const progress = useProgress();
  return useMemo(
    () => VERBS.filter((v) => isDueToday(progress[v.id])).length,
    [progress],
  );
}

export function useWeakIds(): string[] {
  const progress = useProgress();
  return useMemo(
    () => VERBS.filter((v) => progress[v.id]?.isWeak).map((v) => v.id),
    [progress],
  );
}

export function useGroupProgress(groupId: string): {
  percent: number;
  count: number;
  mastered: number;
} {
  const progress = useProgress();
  return useMemo(() => {
    const groupVerbs = VERBS.filter((v) => v.groupId === groupId);
    if (groupVerbs.length === 0) return { percent: 0, count: 0, mastered: 0 };
    let sumMastery = 0;
    let mastered = 0;
    for (const v of groupVerbs) {
      const m = progress[v.id]?.masteryLevel ?? 0;
      sumMastery += m;
      if (m >= 5) mastered += 1;
    }
    return {
      percent: Math.round((sumMastery / (groupVerbs.length * 5)) * 100),
      count: groupVerbs.length,
      mastered,
    };
  }, [progress, groupId]);
}
