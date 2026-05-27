// Local-first backup/restore for Irregular Verbs Trainer.
//
// Exports user progress, shadowing progress, recent practice sessions, and
// settings to a downloadable JSON file. Imports validate the payload
// strictly before writing anything to localStorage. No network calls.

import { VERBS_BY_ID } from "./data/verbs";
import {
  DEFAULT_SETTINGS,
  getProgress,
  getSessions,
  getSettings,
  getShadowing,
  saveProgress,
  saveSessions,
  saveSettings,
  saveShadowing,
} from "./storage";
import type {
  Accent,
  Difficulty,
  PracticeSession,
  Settings,
  ShadowingProgress,
  SpeechSpeed,
  UserVerbProgress,
} from "./types";

export const APP_NAME = "irregular-verbs-trainer";
export const EXPORT_VERSION = 1;
export const APP_DATA_VERSION = "v1";

export type BackupPayload = {
  appName: typeof APP_NAME;
  exportVersion: number;
  exportedAt: string;
  appDataVersion: string;
  knownVerbIds: string[];
  settings: Settings;
  progress: Record<string, UserVerbProgress>;
  shadowing: Record<string, ShadowingProgress>;
  sessions: PracticeSession[];
};

export type ImportResult = {
  importedProgress: number;
  importedShadowing: number;
  importedSessions: number;
  skippedUnknownVerbs: string[];
};

// Keys that we never want to copy from arbitrary JSON, to avoid prototype
// pollution via __proto__ / constructor / prototype injections.
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function safeKeys(obj: Record<string, unknown>): string[] {
  return Object.keys(obj).filter((k) => !FORBIDDEN_KEYS.has(k));
}

function asString(v: unknown, max = 200): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

function asNumber(v: unknown, min: number, max: number, fallback = 0): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(v)));
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

// ---------------- Export ------------------------------------------------

export function buildBackup(): BackupPayload {
  return {
    appName: APP_NAME,
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    appDataVersion: APP_DATA_VERSION,
    knownVerbIds: Object.keys(VERBS_BY_ID).sort(),
    settings: getSettings(),
    progress: getProgress(),
    shadowing: getShadowing(),
    sessions: getSessions(),
  };
}

export function downloadBackup(): void {
  if (typeof window === "undefined") return;
  const payload = buildBackup();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.href = url;
  a.download = `irregular-verbs-trainer-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------- Validation --------------------------------------------

function sanitizeSettings(raw: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (!isPlainObject(raw)) return out;
  const keys = safeKeys(raw);
  const get = (k: string): unknown => (keys.includes(k) ? raw[k] : undefined);

  const qcRaw = Number(get("defaultQuestionCount"));
  out.defaultQuestionCount = ([5, 10, 20, 30] as const).includes(qcRaw as 5 | 10 | 20 | 30)
    ? (qcRaw as Settings["defaultQuestionCount"])
    : DEFAULT_SETTINGS.defaultQuestionCount;

  out.showTranslation = asBool(get("showTranslation"), DEFAULT_SETTINGS.showTranslation);
  out.showExamples = asBool(get("showExamples"), DEFAULT_SETTINGS.showExamples);
  out.difficulty = asEnum<Difficulty>(
    get("difficulty"),
    ["easy", "standard", "hard"],
    DEFAULT_SETTINGS.difficulty,
  );
  out.defaultAccent = asEnum<Accent>(
    get("defaultAccent"),
    ["british", "american"],
    DEFAULT_SETTINGS.defaultAccent,
  );
  out.defaultSpeed = asEnum<SpeechSpeed>(
    get("defaultSpeed"),
    ["slow", "normal", "fast"],
    DEFAULT_SETTINGS.defaultSpeed,
  );
  const pauseRaw = Number(get("pauseAfterSpeakerSec"));
  out.pauseAfterSpeakerSec = ([1, 2, 3, 5] as const).includes(pauseRaw as 1 | 2 | 3 | 5)
    ? (pauseRaw as Settings["pauseAfterSpeakerSec"])
    : DEFAULT_SETTINGS.pauseAfterSpeakerSec;
  const repeatRaw = Number(get("repeatPhraseCount"));
  out.repeatPhraseCount = ([1, 2, 3] as const).includes(repeatRaw as 1 | 2 | 3)
    ? (repeatRaw as Settings["repeatPhraseCount"])
    : DEFAULT_SETTINGS.repeatPhraseCount;
  return out;
}

function sanitizeProgressRecord(raw: unknown, expectedId: string): UserVerbProgress | null {
  if (!isPlainObject(raw)) return null;
  const verbId = asString(raw.verbId, 100) ?? expectedId;
  if (verbId !== expectedId) return null;
  return {
    verbId,
    correctCount: asNumber(raw.correctCount, 0, 1_000_000),
    wrongCount: asNumber(raw.wrongCount, 0, 1_000_000),
    streak: asNumber(raw.streak, 0, 1_000_000),
    masteryLevel: asNumber(raw.masteryLevel, 0, 5),
    lastReviewedAt: asString(raw.lastReviewedAt, 64),
    nextReviewAt: asString(raw.nextReviewAt, 64),
    isWeak: asBool(raw.isWeak),
  };
}

function sanitizeShadowingRecord(raw: unknown, expectedId: string): ShadowingProgress | null {
  if (!isPlainObject(raw)) return null;
  const verbId = asString(raw.verbId, 100) ?? expectedId;
  if (verbId !== expectedId) return null;
  const preferredAccent = asEnum<Accent>(raw.preferredAccent, ["british", "american"], "british");
  const preferredSpeed = asEnum<SpeechSpeed>(
    raw.preferredSpeed,
    ["slow", "normal", "fast"],
    "normal",
  );
  return {
    verbId,
    listenCount: asNumber(raw.listenCount, 0, 1_000_000),
    shadowingCount: asNumber(raw.shadowingCount, 0, 1_000_000),
    lastPracticedAt: asString(raw.lastPracticedAt, 64),
    preferredAccent: raw.preferredAccent === undefined ? undefined : preferredAccent,
    preferredSpeed: raw.preferredSpeed === undefined ? undefined : preferredSpeed,
    confidence: asEnum(raw.confidence, ["low", "medium", "high"] as const, "low"),
    isWeakForShadowing: asBool(raw.isWeakForShadowing),
  };
}

function sanitizeSession(raw: unknown): PracticeSession | null {
  if (!isPlainObject(raw)) return null;
  const id = asString(raw.id, 100);
  const startedAt = asString(raw.startedAt, 64);
  if (!id || !startedAt) return null;
  const total = asNumber(raw.total, 0, 1_000_000);
  const out: PracticeSession = {
    id,
    startedAt,
    finishedAt: asString(raw.finishedAt, 64),
    total,
    correct: asNumber(raw.correct, 0, 1_000_000),
    mode: asString(raw.mode, 64) ?? "unknown",
  };
  if (raw.almost !== undefined) out.almost = asNumber(raw.almost, 0, 1_000_000);
  if (raw.wrong !== undefined) out.wrong = asNumber(raw.wrong, 0, 1_000_000);
  return out;
}

function sanitizeProgressMap(
  raw: unknown,
  unknownIds: Set<string>,
): Record<string, UserVerbProgress> {
  const out: Record<string, UserVerbProgress> = {};
  if (!isPlainObject(raw)) return out;
  for (const key of safeKeys(raw)) {
    if (!VERBS_BY_ID[key]) {
      unknownIds.add(key);
      continue;
    }
    const rec = sanitizeProgressRecord(raw[key], key);
    if (rec) out[key] = rec;
  }
  return out;
}

function sanitizeShadowingMap(
  raw: unknown,
  unknownIds: Set<string>,
): Record<string, ShadowingProgress> {
  const out: Record<string, ShadowingProgress> = {};
  if (!isPlainObject(raw)) return out;
  for (const key of safeKeys(raw)) {
    if (!VERBS_BY_ID[key]) {
      unknownIds.add(key);
      continue;
    }
    const rec = sanitizeShadowingRecord(raw[key], key);
    if (rec) out[key] = rec;
  }
  return out;
}

// ---------------- Import ------------------------------------------------

export class BackupShapeError extends Error {}

export function importBackupFromString(jsonText: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new BackupShapeError("Файл не похож на экспорт прогресса.");
  }
  if (!isPlainObject(parsed)) {
    throw new BackupShapeError("Файл не похож на экспорт прогресса.");
  }

  const appName = asString(parsed.appName, 64);
  const exportVersion = parsed.exportVersion;
  const hasShape =
    isPlainObject(parsed.settings) ||
    isPlainObject(parsed.progress) ||
    isPlainObject(parsed.shadowing) ||
    Array.isArray(parsed.sessions);

  if (appName !== APP_NAME && !hasShape) {
    throw new BackupShapeError("Файл не похож на экспорт прогресса.");
  }
  if (typeof exportVersion === "number" && exportVersion > EXPORT_VERSION) {
    throw new BackupShapeError("Версия экспорта не поддерживается этой версией приложения.");
  }

  const unknownIds = new Set<string>();

  const settings = sanitizeSettings(parsed.settings);
  const progress = sanitizeProgressMap(parsed.progress, unknownIds);
  const shadowing = sanitizeShadowingMap(parsed.shadowing, unknownIds);
  const sessions = Array.isArray(parsed.sessions)
    ? parsed.sessions
        .map(sanitizeSession)
        .filter((s): s is PracticeSession => s !== null)
        .slice(0, 1000)
    : [];

  // Atomic-ish write: save all four buckets in sequence. Each call is
  // wrapped in try/catch inside storage.ts so a quota error on one bucket
  // doesn't crash the import — partial restore is preferable to nothing.
  saveSettings(settings);
  saveProgress(progress);
  saveShadowing(shadowing);
  saveSessions(sessions);

  return {
    importedProgress: Object.keys(progress).length,
    importedShadowing: Object.keys(shadowing).length,
    importedSessions: sessions.length,
    skippedUnknownVerbs: Array.from(unknownIds),
  };
}
