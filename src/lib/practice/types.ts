// Shared practice domain types and label tables.
// Kept outside React components so they can be reused by the route, the
// setup screen, the runner, and pure helpers.

export const PRACTICE_MODES = [
  "auto",
  "fill",
  "choice_pp",
  "choice_ps_pp",
  "ru_en",
  "self_check",
] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];

export type ConcreteMode = Exclude<PracticeMode, "auto">;
export const CONCRETE_MODES: readonly ConcreteMode[] = [
  "fill",
  "choice_pp",
  "choice_ps_pp",
  "ru_en",
  "self_check",
] as const;

export const PRACTICE_SCOPES = [
  "all",
  "new",
  "weak",
  "due",
  "group",
  "single",
] as const;
export type PracticeScope = (typeof PRACTICE_SCOPES)[number];

export type Difficulty = "easy" | "standard" | "hard";

export const MODE_LABEL: Record<PracticeMode, string> = {
  auto: "Авто (по сложности)",
  fill: "Заполнить пропущенные формы",
  choice_pp: "Выбор: Present Perfect (3-я форма)",
  choice_ps_pp: "Past Simple или Past Participle",
  ru_en: "Перевод с русского",
  self_check: "Быстрая самопроверка",
};

export const SCOPE_LABEL: Record<PracticeScope, string> = {
  all: "Все глаголы",
  new: "Только новые",
  weak: "Только слабые",
  due: "Сегодня к повторению",
  group: "Конкретная группа",
  single: "Один глагол",
};

export const QUESTION_COUNT_OPTIONS = [5, 10, 20, 30] as const;
export type QuestionCount = (typeof QUESTION_COUNT_OPTIONS)[number];

export function isPracticeMode(v: unknown): v is PracticeMode {
  return typeof v === "string" && (PRACTICE_MODES as readonly string[]).includes(v);
}

export function isPracticeScope(v: unknown): v is PracticeScope {
  return typeof v === "string" && (PRACTICE_SCOPES as readonly string[]).includes(v);
}

export function isDifficulty(v: unknown): v is Difficulty {
  return v === "easy" || v === "standard" || v === "hard";
}
