"use client";
import { usePermission, useAnyPermission } from "@/hooks/usePermission";
import { AccessDenied } from "./AccessDenied";

interface PermissionGuardProps {
  require?: string;
  requireAny?: string[];
  /** inline (default): hide children with null/fallback. page: full AccessDenied panel. */
  mode?: "inline" | "page";
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGuard({
  require,
  requireAny,
  mode = "inline",
  fallback,
  children,
}: PermissionGuardProps) {
  const singlePerm = usePermission(require ?? "");
  const anyPerm = useAnyPermission(requireAny ?? []);

  const allowed = require ? singlePerm : requireAny ? anyPerm : true;

  if (!allowed) {
    if (fallback !== undefined) return <>{fallback}</>;
    if (mode === "page") return <AccessDenied />;
    return null;
  }
  return <>{children}</>;
}
