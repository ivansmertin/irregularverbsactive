// Pure session-result helpers.

import { getSessions, saveSessions } from "@/lib/storage";
import type { PracticeSession } from "@/lib/types";

const MAX_KEPT_SESSIONS = 30;

/**
 * Stable, collision-resistant session id. Prefer crypto.randomUUID when
 * available; otherwise fall back to a timestamp + random suffix (the old
 * `${Date.now()}` could collide if two sessions ended in the same ms).
 */
function makeSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function recordPracticeSession(input: {
  total: number;
  correct: number;
  almost?: number;
  wrong?: number;
  modeLabel: string;
}): void {
  const now = new Date().toISOString();
  const session: PracticeSession = {
    id: makeSessionId(),
    startedAt: now,
    finishedAt: now,
    total: input.total,
    correct: input.correct,
    almost: input.almost,
    wrong: input.wrong,
    mode: input.modeLabel,
  };
  const sessions = getSessions();
  sessions.unshift(session);
  saveSessions(sessions.slice(0, MAX_KEPT_SESSIONS));
}

/**
 * Weighted accuracy percent. "almost" answers count as half a correct
 * answer — matches the in-session liveAccuracy formula in PracticeRunner.
 */
export function computeAccuracyPercent(correct: number, total: number, almost = 0): number {
  if (total <= 0) return 0;
  return Math.round(((correct + almost * 0.5) / total) * 100);
}
