"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Per-browser memory of the user's pinned and recently visited pages.
 *
 * Backed by localStorage and shared through a tiny external store so the
 * sidebar and command palette update together (and across tabs). Storage can
 * be unavailable (private mode, blocked site data) — every access degrades to
 * an empty list rather than throwing.
 */

const PINNED_KEY = "ims:nav:pinned";
const RECENT_KEY = "ims:nav:recent";
const MAX_PINNED = 12;
const MAX_RECENT = 6;
const EMPTY: readonly string[] = Object.freeze([]);

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: readonly string[] }>();

function read(key: string): readonly string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return EMPTY;
  }
  // Return a stable reference while the stored string is unchanged —
  // useSyncExternalStore re-renders forever on a fresh array per call.
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  let value: readonly string[] = EMPTY;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) value = parsed.filter((v): v is string => typeof v === "string");
  } catch {
    /* corrupt entry — treat as empty */
  }
  cache.set(key, { raw, value });
  return value;
}

function write(key: string, value: readonly string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — memory is best-effort */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PINNED_KEY || e.key === RECENT_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerSnapshot = () => EMPTY;

export function usePinnedPages() {
  const pinned = useSyncExternalStore(subscribe, () => read(PINNED_KEY), getServerSnapshot);

  const isPinned = useCallback((href: string) => pinned.includes(href), [pinned]);

  const togglePin = useCallback((href: string) => {
    const current = read(PINNED_KEY);
    write(
      PINNED_KEY,
      current.includes(href)
        ? current.filter((h) => h !== href)
        : [...current, href].slice(-MAX_PINNED)
    );
  }, []);

  return { pinned, isPinned, togglePin };
}

export function useRecentPages() {
  return useSyncExternalStore(subscribe, () => read(RECENT_KEY), getServerSnapshot);
}

/** Move `href` to the front of the recent list. */
export function recordRecentPage(href: string) {
  const current = read(RECENT_KEY);
  if (current[0] === href) return;
  write(RECENT_KEY, [href, ...current.filter((h) => h !== href)].slice(0, MAX_RECENT));
}
