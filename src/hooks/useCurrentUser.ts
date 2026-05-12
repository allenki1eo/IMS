"use client";
import { useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@/types/auth";

let cachedUser: AuthUser | null = null;
let lastFetched = 0;
let inFlightUserRequest: Promise<AuthUser | null> | null = null;
const CACHE_TTL = 30_000; // 30 seconds

async function requestCurrentUser(): Promise<AuthUser | null> {
  if (!inFlightUserRequest) {
    inFlightUserRequest = fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        return data.data as AuthUser;
      })
      .finally(() => {
        inFlightUserRequest = null;
      });
  }

  return inFlightUserRequest;
}

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
      const currentUser = await requestCurrentUser();
      cachedUser = currentUser;
      lastFetched = Date.now();
      setUser(currentUser);
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
