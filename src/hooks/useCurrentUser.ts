"use client";
import { useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@/types/auth";

let cachedUser: AuthUser | null = null;
let lastFetched = 0;
const CACHE_TTL = 30_000; // 30 seconds

export function useCurrentUser() {
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  const fetchUser = useCallback(async () => {
    const now = Date.now();
    if (cachedUser && now - lastFetched < CACHE_TTL) {
      setUser(cachedUser);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        cachedUser = data.data;
        lastFetched = Date.now();
        setUser(cachedUser);
      } else {
        cachedUser = null;
        setUser(null);
      }
    } catch {
      // offline — keep last known user
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const invalidate = () => { cachedUser = null; lastFetched = 0; fetchUser(); };

  return { user, loading, invalidate };
}
