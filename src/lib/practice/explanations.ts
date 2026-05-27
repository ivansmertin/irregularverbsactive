// Grammar-aware explanations for practice feedback.
// Pure helpers — no React, no DOM.

import type { Verb } from "@/lib/types";

const PAST_SIMPLE_CUES: Array<{ re: RegExp; label: string }> = [
  { re: /\byesterday\b/i, label: "yesterday" },
  { re: /\b\w+\s+ago\b/i, label: "… ago" },
  { re: /\blast\s+\w+/i, label: "last …" },
  { re: /\bin\s+\d{4}\b/i, label: "in <год>" },
  { re: /\bwhen\s+\w+/i, label: "when …" },
  { re: /\bthis\s+morning\b/i, label: "this morning" },
];

export function detectPastSimpleCue(sentence: string): string | null {
  for (const c of PAST_SIMPLE_CUES) if (c.re.test(sentence)) return c.label;
  return null;
}

function altSuffix(forms?: string[]): string {
  return forms?.length ? ` (или ${forms.join(", ")})` : "";
}

export function explainFill(verb: Verb, ok: boolean): string {
  const ps = verb.pastSimple + altSuffix(verb.alternativePastSimple);
  const pp = verb.pastParticiple + altSuffix(verb.alternativePastParticiple);
  if (ok) {
    return `Верно. ${verb.infinitive} — ${verb.pastSimple} — ${verb.pastParticiple}. Вторая форма используется в Past Simple, третья — в Present Perfect и Passive.`;
  }
  return `Правильные формы: ${ps} — ${pp}. Past Simple (2-я) — для действий в прошлом; Past Participle (3-я) — после have/has/had и в страдательном залоге.`;
}

export function explainChoicePP(verb: Verb, ok: boolean): string {
  const pp = verb.pastParticiple + altSuffix(verb.alternativePastParticiple);
  const lead = ok ? "Верно." : "Не совсем.";
  return `${lead} После have/has нужна третья форма (Past Participle): ${pp}.`;
}

export function explainChoicePS(verb: Verb, ok: boolean): string {
  const cue = detectPastSimpleCue(verb.examples.pastSimple);
  const ps = verb.pastSimple + altSuffix(verb.alternativePastSimple);
  const lead = ok ? "Верно." : "Не совсем.";
  const cueText = cue
    ? `«${cue}» указывает на Past Simple, поэтому нужна вторая форма`
    : "В прошедшем простом времени нужна вторая форма";
  return `${lead} ${cueText}: ${ps}.`;
}

export function explainRuEn(verb: Verb, ok: boolean): string {
  const tail = `${verb.infinitive} — ${verb.pastSimple} — ${verb.pastParticiple}.`;
  if (ok) return `Верно. Три формы: ${tail}`;
  return `Правильный ответ: ${tail} Запомните все три формы — они нужны для разных времён.`;
}

export function explainSelfCheck(
  verb: Verb,
  level: "known" | "almost" | "unknown",
): string {
  const tail = `${verb.infinitive} — ${verb.pastSimple} — ${verb.pastParticiple}.`;
  if (level === "known") return `Отлично: ${tail}`;
  if (level === "almost")
    return `Почти — повторим раньше обычного, чтобы закрепить: ${tail}`;
  return `Правильный ответ: ${tail}`;
}

export const WEAK_VERB_NOTE =
  "Глагол добавлен в слабые — по нему накопились ошибки. Появится в наборе «Слабые».";
