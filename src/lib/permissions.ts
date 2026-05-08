import type { AuthUser } from "@/types/auth";

export function hasPermission(user: AuthUser, permission: string): boolean {
  if (user.permissions.includes("*")) return true;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: AuthUser, permissions: string[]): boolean {
  if (user.permissions.includes("*")) return true;
  return permissions.some((p) => user.permissions.includes(p));
}

export function hasRole(user: AuthUser, role: string): boolean {
  return user.roles.includes(role);
}
