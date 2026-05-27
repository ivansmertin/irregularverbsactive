// React subscription hooks for the localStorage-backed app state.
//
// Use these instead of the old `useEffect(() => setX(getX()), [])` pattern
// to avoid the "flash of zeros" on first paint, and to make components
// react to writes from other components / other tabs without page reload.
//
// All hooks use useSyncExternalStore so:
//   • SSR renders the default/empty snapshot (no localStorage call).
//   • Client hydration switches to the real value on first commit.
//   • Subsequent writes via save* functions update every subscriber.

import { useSyncExternalStore } from "react";

import {
  DEFAULT_SETTINGS,
  emptySnapshot,
  getProgress,
  getSessions,
  getSettings,
  getShadowing,
  storageSubscribe,
} from "@/lib/storage";
import type { PracticeSession, Settings, ShadowingProgress, UserVerbProgress } from "@/lib/types";

export function useProgress(): Record<string, UserVerbProgress> {
  return useSyncExternalStore(storageSubscribe, getProgress, emptySnapshot.progress);
}

export function useShadowing(): Record<string, ShadowingProgress> {
  return useSyncExternalStore(storageSubscribe, getShadowing, emptySnapshot.shadowing);
}

export function useSessions(): PracticeSession[] {
  return useSyncExternalStore(storageSubscribe, getSessions, emptySnapshot.sessions);
}

export function useSettings(): Settings {
  return useSyncExternalStore(storageSubscribe, getSettings, () => DEFAULT_SETTINGS);
}
