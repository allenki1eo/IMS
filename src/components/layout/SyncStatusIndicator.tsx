"use client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

export function SyncStatusIndicator() {
  const status = useOnlineStatus();

  const config = {
    online: { dot: "bg-green-500", label: "Online", className: "text-green-700" },
    offline: { dot: "bg-gray-400", label: "Offline", className: "text-gray-500" },
    checking: { dot: "bg-yellow-500 animate-pulse", label: "Checking", className: "text-yellow-700" },
  }[status];

  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium", config.className)}>
      <span className={cn("h-2 w-2 rounded-full", config.dot)} />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}
