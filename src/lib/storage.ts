import type { PracticeSession, Settings, ShadowingProgress, UserVerbProgress } from "./types";

const KEYS = {
  progress: "ivt.progress.v1",
  shadowing: "ivt.shadowing.v1",
  settings: "ivt.settings.v1",
  sessions: "ivt.sessions.v1",
};

// All localStorage access is guarded by isBrowser() so the module is safe
// to import during SSR / prerender, where `window` is undefined.
const isBrowser = () => typeof window !== "undefined";

// ----- Reactive store ----------------------------------------------------
//
// `useSyncExternalStore` needs (subscribe, getSnapshot). To keep snapshots
// referentially stable (so React doesn't see "different" objects every
// render and bail into an infinite loop), we cache the last-parsed value
// per key and re-parse only when a write actually happened.
//
// We bump a per-key version counter on every write — local writes and
// cross-tab storage events both increment it — and snapshots are
// re-parsed lazily on read.

type Listener = () => void;
const listeners = new Set<Listener>();
const versions: Record<string, number> = {};
const snapshots = new Map<string, { v: number; value: unknown }>();

function bump(key: string) {
  versions[key] = (versions[key] ?? 0) + 1;
  // Invalidate the snapshot so the next getSnapshot re-reads from
  // localStorage and produces a NEW object reference.
  snapshots.delete(key);
  for (const l of listeners) l();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (isBrowser()) {
  // Cross-tab updates: storage events fire in OTHER tabs only.
  window.addEventListener("storage", (e) => {
    if (!e.key) {
      // localStorage.clear() — invalidate everything we know.
      snapshots.clear();
      Object.keys(versions).forEach((k) => {
        versions[k] = (versions[k] ?? 0) + 1;
      });
      for (const l of listeners) l();
      return;
    }
    if (
      e.key === KEYS.progress ||
      e.key === KEYS.shadowing ||
      e.key === KEYS.settings ||
      e.key === KEYS.sessions
    ) {
      bump(e.key);
    }
  });
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readCached<T>(key: string, fallback: T): T {
  const v = versions[key] ?? 0;
  const cached = snapshots.get(key);
  if (cached && cached.v === v) return cached.value as T;
  const value = read<T>(key, fallback);
  snapshots.set(key, { v, value });
  return value;
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore — quota exceeded etc.
  }
  bump(key);
}

export const DEFAULT_SETTINGS: Settings = {
  defaultQuestionCount: 10,
  showTranslation: true,
  showExamples: true,
  difficulty: "standard",
  defaultAccent: "british",
  defaultSpeed: "normal",
  pauseAfterSpeakerSec: 2,
  repeatPhraseCount: 1,
};

// ----- Storage accessors -------------------------------------------------
//
// `get*` functions are still used by non-reactive callers (e.g. event
// handlers that need a one-shot read). They return the cached snapshot so
// every reader inside one render sees the same object reference.

export const getProgress = () =>
  readCached<Record<string, UserVerbProgress>>(KEYS.progress, {});
export const saveProgress = (p: Record<string, UserVerbProgress>) => write(KEYS.progress, p);

export const getShadowing = () =>
  readCached<Record<string, ShadowingProgress>>(KEYS.shadowing, {});
export const saveShadowing = (p: Record<string, ShadowingProgress>) => write(KEYS.shadowing, p);

const SETTINGS_CACHE_KEY = "__settings_merged__";
export const getSettings = (): Settings => {
  // The merged-with-defaults object needs its own snapshot cache, else
  // every getSettings() call returns a fresh object and breaks
  // useSyncExternalStore identity.
  const v = versions[KEYS.settings] ?? 0;
  const cached = snapshots.get(SETTINGS_CACHE_KEY);
  if (cached && cached.v === v) return cached.value as Settings;
  const merged: Settings = {
    ...DEFAULT_SETTINGS,
    ...read<Partial<Settings>>(KEYS.settings, {}),
  };
  snapshots.set(SETTINGS_CACHE_KEY, { v, value: merged });
  return merged;
};
export const saveSettings = (s: Settings) => write(KEYS.settings, s);

export const getSessions = () => readCached<PracticeSession[]>(KEYS.sessions, []);
export const saveSessions = (s: PracticeSession[]) => write(KEYS.sessions, s);

export function resetAllProgress() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEYS.progress);
  localStorage.removeItem(KEYS.shadowing);
  localStorage.removeItem(KEYS.sessions);
  bump(KEYS.progress);
  bump(KEYS.shadowing);
  bump(KEYS.sessions);
}

// ----- Reactive subscription primitive ----------------------------------
//
// useSyncExternalStore-compatible: a single subscribe function fires for
// any storage change. Each consumer passes its own getSnapshot which
// reads (cached) storage and returns a stable reference until the next
// write.
//
// Consumers don't import KEYS directly — they call e.g. getProgress()
// inside their snapshot function.

export const storageSubscribe = subscribe;

/**
 * SSR-safe initial snapshot for useSyncExternalStore. Always returns the
 * default/empty value so server-rendered HTML matches the first client
 * paint (before hydration applies the real localStorage value).
 */
export const emptySnapshot = {
  progress: () => ({}) as Record<string, UserVerbProgress>,
  shadowing: () => ({}) as Record<string, ShadowingProgress>,
  sessions: () => [] as PracticeSession[],
  settings: () => DEFAULT_SETTINGS,
};
