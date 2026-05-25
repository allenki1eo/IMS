"use client";
import { useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@/types/auth";

let cachedUser: AuthUser | null = null;
let lastFetched = 0;
let pendingUserRequest: Promise<AuthUser | null> | null = null;
const CACHE_TTL = 30_000; // 30 seconds

async function loadCurrentUser(): Promise<AuthUser | null> {
  const now = Date.now();
  if (cachedUser && now - lastFetched < CACHE_TTL) {
    return cachedUser;
  }

  if (pendingUserRequest) {
    return pendingUserRequest;
  }

  pendingUserRequest = fetch("/api/auth/me")
    .then(async (res) => {
      if (!res.ok) {
        cachedUser = null;
        return null;
      }

      const data = await res.json();
      cachedUser = data.data;
      lastFetched = Date.now();
      return cachedUser;
    })
    .catch(() => cachedUser)
    .finally(() => {
      pendingUserRequest = null;
    });

  return pendingUserRequest;
}

export function useCurrentUser() {
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  const fetchUser = useCallback(async () => {
    const currentUser = await loadCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const invalidate = () => {
    cachedUser = null;
    lastFetched = 0;
    pendingUserRequest = null;
    fetchUser();
  };

  return { user, loading, invalidate };
}
