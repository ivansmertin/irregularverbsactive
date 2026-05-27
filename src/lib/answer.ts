import type { Verb } from "./types";

export function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function splitForms(input: string): string[] {
  return input
    .split(/[—–\-,/|]+/)
    .map((s) => normalize(s))
    .filter(Boolean);
}

export function checkPastSimple(verb: Verb, input: string): boolean {
  const n = normalize(input);
  if (n === normalize(verb.pastSimple)) return true;
  return (verb.alternativePastSimple ?? []).some((a) => normalize(a) === n);
}

export function checkPastParticiple(verb: Verb, input: string): boolean {
  const n = normalize(input);
  if (n === normalize(verb.pastParticiple)) return true;
  return (verb.alternativePastParticiple ?? []).some((a) => normalize(a) === n);
}

export function checkAllForms(verb: Verb, ps: string, pp: string): boolean {
  return checkPastSimple(verb, ps) && checkPastParticiple(verb, pp);
}

export function checkInfinitiveTriple(verb: Verb, input: string): boolean {
  const parts = splitForms(input);
  if (parts.length < 3) return false;
  const [inf, ps, pp] = parts;
  return (
    inf === normalize(verb.infinitive) &&
    checkPastSimple(verb, ps) &&
    checkPastParticiple(verb, pp)
  );
}
