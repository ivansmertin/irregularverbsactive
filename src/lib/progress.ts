import { VERBS } from "./data/verbs";
import {
  getProgress,
  getShadowing,
  saveProgress,
  saveShadowing,
} from "./storage";
import type { ShadowingProgress, UserVerbProgress } from "./types";

// SRS interval ladder (days). masteryLevel indexes into this array: a correct
// answer advances the level (longer wait), a wrong answer drops it back to a
// shorter interval. Level 0 = review today, level 5 = review in 14 days.
const REVIEW_INTERVAL_DAYS = [0, 1, 2, 4, 7, 14];

export function emptyProgress(verbId: string): UserVerbProgress {
  return {
    verbId,
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    masteryLevel: 0,
    isWeak: false,
  };
}

export function emptyShadowing(verbId: string): ShadowingProgress {
  return {
    verbId,
    listenCount: 0,
    shadowingCount: 0,
    confidence: "low",
    isWeakForShadowing: false,
  };
}

export function getOrInitProgress(verbId: string): UserVerbProgress {
  const all = getProgress();
  return all[verbId] ?? emptyProgress(verbId);
}

export function getOrInitShadowing(verbId: string): ShadowingProgress {
  const all = getShadowing();
  return all[verbId] ?? emptyShadowing(verbId);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function recordAnswer(verbId: string, correct: boolean): UserVerbProgress {
  const all = getProgress();
  const cur = all[verbId] ?? emptyProgress(verbId);
  const now = new Date();
  if (correct) {
    cur.correctCount += 1;
    cur.streak += 1;
    cur.masteryLevel = Math.min(5, cur.masteryLevel + 1);
  } else {
    cur.wrongCount += 1;
    cur.streak = 0;
    cur.masteryLevel = Math.max(0, cur.masteryLevel - 1);
    cur.isWeak = true;
  }
  cur.lastReviewedAt = now.toISOString();
  const next = addDays(now, REVIEW_INTERVAL_DAYS[cur.masteryLevel] ?? 0);
  cur.nextReviewAt = next.toISOString();

  // accuracy-based weakness
  const total = cur.correctCount + cur.wrongCount;
  if (total >= 3 && cur.correctCount / total < 0.7) cur.isWeak = true;
  if (cur.masteryLevel >= 4 && cur.correctCount / Math.max(1, total) >= 0.8) {
    cur.isWeak = false;
  }

  all[verbId] = cur;
  saveProgress(all);
  return cur;
}

export function markSelfCheck(verbId: string, level: "known" | "almost" | "unknown") {
  if (level === "known") return recordAnswer(verbId, true);
  if (level === "unknown") {
    const p = recordAnswer(verbId, false);
    p.isWeak = true;
    const all = getProgress();
    all[verbId] = p;
    saveProgress(all);
    return p;
  }
  // "almost": neutral - small bump but keep masteryLevel
  const all = getProgress();
  const cur = all[verbId] ?? emptyProgress(verbId);
  cur.lastReviewedAt = new Date().toISOString();
  cur.nextReviewAt = addDays(new Date(), 1).toISOString();
  all[verbId] = cur;
  saveProgress(all);
  return cur;
}

export function recordShadowingDone(verbId: string) {
  const all = getShadowing();
  const cur = all[verbId] ?? emptyShadowing(verbId);
  cur.shadowingCount += 1;
  cur.lastPracticedAt = new Date().toISOString();
  if (cur.shadowingCount >= 6) cur.confidence = "high";
  else if (cur.shadowingCount >= 3) cur.confidence = "medium";
  all[verbId] = cur;
  saveShadowing(all);
}

export function recordShadowingHard(verbId: string) {
  const sh = getShadowing();
  const cur = sh[verbId] ?? emptyShadowing(verbId);
  cur.isWeakForShadowing = true;
  cur.confidence = "low";
  cur.lastPracticedAt = new Date().toISOString();
  sh[verbId] = cur;
  saveShadowing(sh);

  const pr = getProgress();
  const p = pr[verbId] ?? emptyProgress(verbId);
  p.isWeak = true;
  pr[verbId] = p;
  saveProgress(pr);
}

export function recordListen(verbId: string) {
  const all = getShadowing();
  const cur = all[verbId] ?? emptyShadowing(verbId);
  cur.listenCount += 1;
  cur.lastPracticedAt = new Date().toISOString();
  all[verbId] = cur;
  saveShadowing(all);
}

export function isDueToday(p: UserVerbProgress | undefined): boolean {
  if (!p) return true; // new verb
  if (!p.nextReviewAt) return true;
  return new Date(p.nextReviewAt).getTime() <= Date.now();
}

export function getDueVerbIds(): string[] {
  const all = getProgress();
  return VERBS.filter((v) => isDueToday(all[v.id])).map((v) => v.id);
}

export function getWeakVerbIds(): string[] {
  const all = getProgress();
  return VERBS.filter((v) => all[v.id]?.isWeak).map((v) => v.id);
}

export function getStats() {
  const all = getProgress();
  const sh = getShadowing();
  const total = VERBS.length;
  const touched = VERBS.filter((v) => all[v.id]).length;
  const mastered = VERBS.filter((v) => (all[v.id]?.masteryLevel ?? 0) >= 5).length;
  const weak = VERBS.filter((v) => all[v.id]?.isWeak).length;
  const learned = VERBS.filter((v) => (all[v.id]?.masteryLevel ?? 0) >= 2).length;

  let totalAnswers = 0;
  let totalCorrect = 0;
  for (const v of VERBS) {
    const p = all[v.id];
    if (!p) continue;
    totalAnswers += p.correctCount + p.wrongCount;
    totalCorrect += p.correctCount;
  }
  const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  const shadowingDone = Object.values(sh).reduce((s, x) => s + x.shadowingCount, 0);
  const shadowingWeak = Object.values(sh).filter((x) => x.isWeakForShadowing).length;

  return {
    total,
    touched,
    learned,
    mastered,
    weak,
    accuracy,
    overallPercent: Math.round(
      (VERBS.reduce((s, v) => s + (all[v.id]?.masteryLevel ?? 0), 0) / (total * 5)) * 100,
    ),
    shadowingDone,
    shadowingWeak,
  };
}

export function getGroupProgress(groupId: string) {
  const all = getProgress();
  const groupVerbs = VERBS.filter((v) => v.groupId === groupId);
  if (groupVerbs.length === 0) return { percent: 0, count: 0, mastered: 0 };
  const sumMastery = groupVerbs.reduce(
    (s, v) => s + (all[v.id]?.masteryLevel ?? 0),
    0,
  );
  const percent = Math.round((sumMastery / (groupVerbs.length * 5)) * 100);
  const mastered = groupVerbs.filter(
    (v) => (all[v.id]?.masteryLevel ?? 0) >= 5,
  ).length;
  return { percent, count: groupVerbs.length, mastered };
}
