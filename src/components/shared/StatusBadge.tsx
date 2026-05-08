import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusConfig = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
};

const STATUS_MAP: Record<string, StatusConfig> = {
  // Generic
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "secondary" },
  true: { label: "Active", variant: "success" },
  false: { label: "Inactive", variant: "secondary" },
  // Employee
  ON_LEAVE: { label: "On Leave", variant: "warning" },
  TERMINATED: { label: "Terminated", variant: "destructive" },
  // Approval
  PENDING: { label: "Pending", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
  ESCALATED: { label: "Escalated", variant: "info" },
  // Priority
  NORMAL: { label: "Normal", variant: "outline" },
  URGENT: { label: "Urgent", variant: "warning" },
  CRITICAL: { label: "Critical", variant: "destructive" },
  // Employment type
  PERMANENT: { label: "Permanent", variant: "default" },
  CONTRACT: { label: "Contract", variant: "info" },
  CASUAL: { label: "Casual", variant: "secondary" },
  TEMPORARY: { label: "Temporary", variant: "outline" },
};

interface StatusBadgeProps {
  status: string | boolean;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = String(status);
  const config = STATUS_MAP[key] ?? { label: key, variant: "outline" as const };
  return (
    <Badge variant={config.variant} className={cn("font-medium", className)}>
      {config.label}
    </Badge>
  );
}
