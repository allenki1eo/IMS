"use client";
import { usePermission, useAnyPermission } from "@/hooks/usePermission";

interface PermissionGuardProps {
  require?: string;
  requireAny?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGuard({
  require,
  requireAny,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const singlePerm = usePermission(require ?? "");
  const anyPerm = useAnyPermission(requireAny ?? []);

  const allowed = require ? singlePerm : requireAny ? anyPerm : true;

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
