// Pure helpers for practice question generation. No React, no DOM.
// Kept side-effect-free so they can be unit-tested and reused.

import { VERBS, VERBS_BY_ID } from "@/lib/data/verbs";
import { getDueVerbIds } from "@/lib/progress";
import { getProgress } from "@/lib/storage";
import type { Verb } from "@/lib/types";
import { CONCRETE_MODES, type ConcreteMode, type Difficulty, type PracticeScope } from "./types";

// Weighted distribution of question types per difficulty.
// Easy leans on multiple choice + translation hints. Hard leans on free input
// and discrimination between Past Simple and Past Participle.
const MODE_WEIGHTS: Record<Difficulty, Record<ConcreteMode, number>> = {
  easy: { choice_pp: 0.4, choice_ps_pp: 0.3, fill: 0.15, self_check: 0.15, ru_en: 0 },
  standard: { choice_pp: 0.2, choice_ps_pp: 0.2, fill: 0.25, ru_en: 0.2, self_check: 0.15 },
  hard: { fill: 0.35, ru_en: 0.35, choice_ps_pp: 0.2, choice_pp: 0.05, self_check: 0.05 },
};

export function pickModeByDifficulty(difficulty: Difficulty): ConcreteMode {
  const weights = MODE_WEIGHTS[difficulty];
  const total = CONCRETE_MODES.reduce((s, m) => s + (weights[m] ?? 0), 0);
  let r = Math.random() * total;
  for (const m of CONCRETE_MODES) {
    r -= weights[m] ?? 0;
    if (r <= 0) return m;
  }
  return "fill";
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickPool(scope: PracticeScope, groupId?: string, verbId?: string): Verb[] {
  const progress = getProgress();
  switch (scope) {
    case "single":
      // Unknown verbId → empty pool. The runner surfaces an empty state
      // instead of silently switching to the full corpus.
      return verbId && VERBS_BY_ID[verbId] ? [VERBS_BY_ID[verbId]] : [];
    case "group":
      return VERBS.filter((v) => v.groupId === groupId);
    case "new":
      return VERBS.filter((v) => !progress[v.id]);
    case "weak":
      return VERBS.filter((v) => progress[v.id]?.isWeak);
    case "due": {
      const due = new Set(getDueVerbIds());
      return VERBS.filter((v) => due.has(v.id));
    }
    case "all":
    default:
      return VERBS.slice();
  }
}

export function buildQuestionList(
  scope: PracticeScope,
  groupId: string | undefined,
  verbId: string | undefined,
  count: number,
): Verb[] {
  // NB: when the selected scope yields an empty pool (no weak verbs, no
  // due verbs, empty group, unknown verbId), we return []. The runner
  // surfaces an empty-state message instead of silently substituting the
  // full corpus — that previous fallback misled the user about what they
  // were practising.
  const pool = pickPool(scope, groupId, verbId);
  if (pool.length === 0) return [];
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

export function buildModeSequence(
  size: number,
  selectedMode: ConcreteMode | "auto",
  difficulty: Difficulty,
): ConcreteMode[] {
  if (selectedMode === "auto") {
    return Array.from({ length: size }, () => pickModeByDifficulty(difficulty));
  }
  return Array.from({ length: size }, () => selectedMode);
}

export function buildChoiceOptionsPP(verb: Verb): string[] {
  return shuffle([
    verb.pastParticiple,
    verb.pastSimple,
    verb.infinitive,
    `${verb.infinitive}ing`,
  ]).filter((v, i, a) => a.indexOf(v) === i);
}

// Escape RegExp metacharacters so verb forms with punctuation (apostrophes,
// dots, etc.) don't blow up the mask. \b only works around \w characters,
// so we fall back to a non-word-boundary lookaround for forms ending in
// punctuation — keeps the mask correct for words like "shouldn't" if they
// ever land in the dataset.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function maskForm(sentence: string, form: string): string {
  if (!form) return sentence;
  const escaped = escapeRegex(form);
  const startsWithWord = /^\w/.test(form);
  const endsWithWord = /\w$/.test(form);
  const prefix = startsWithWord ? "\\b" : "(?<!\\S)";
  const suffix = endsWithWord ? "\\b" : "(?!\\S)";
  return sentence.replace(new RegExp(`${prefix}${escaped}${suffix}`, "i"), "___");
}
