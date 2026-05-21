"use client";
import { useCurrentUser } from "./useCurrentUser";

export function useCurrency() {
  const { user } = useCurrentUser();
  return user?.companies?.[0]?.currency ?? "TZS";
}
