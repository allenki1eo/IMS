"use client";
import { useCurrentUser } from "./useCurrentUser";

export function usePermission(permission: string): boolean {
  const { user } = useCurrentUser();
  if (!user) return false;
  if (user.permissions.includes("*")) return true;
  return user.permissions.includes(permission);
}

export function useAnyPermission(permissions: string[]): boolean {
  const { user } = useCurrentUser();
  if (!user) return false;
  if (user.permissions.includes("*")) return true;
  return permissions.some((p) => user.permissions.includes(p));
}
