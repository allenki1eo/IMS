"use client";
import { useState, useEffect, useCallback } from "react";

export function useLocalDraft<T>(key: string, defaultValue: T) {
  const storageKey = `erp_draft_${key}`;

  const [draft, setDraftState] = useState<T>(defaultValue);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setDraftState(JSON.parse(stored));
        setHasDraft(true);
      }
    } catch {}
  }, [storageKey]);

  const saveDraft = useCallback(
    (value: T) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
        setDraftState(value);
        setHasDraft(true);
      } catch {}
    },
    [storageKey]
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
    } catch {}
  }, [storageKey]);

  return { draft, hasDraft, saveDraft, clearDraft };
}
