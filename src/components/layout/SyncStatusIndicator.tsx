"use client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

export function SyncStatusIndicator() {
  const status = useOnlineStatus();

  const config = {
    online: { dot: "bg-success", label: "Online", className: "text-success" },
    offline: { dot: "bg-muted-foreground/50", label: "Offline", className: "text-muted-foreground" },
    checking: { dot: "bg-warning animate-pulse", label: "Checking", className: "text-warning" },
  }[status];

  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium", config.className)}>
      <span className={cn("h-2 w-2 rounded-full", config.dot)} />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}
