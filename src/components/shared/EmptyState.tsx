import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Compact for table cells / cards */
  compact?: boolean;
}

export function EmptyState({
  title = "No results",
  description = "Nothing to show here yet.",
  icon,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-10 px-4" : "py-16 px-4",
        className
      )}
    >
      <div
        className={cn(
          "mb-4 flex items-center justify-center rounded-full bg-muted text-muted-foreground",
          compact ? "h-10 w-10" : "h-12 w-12"
        )}
      >
        {icon ?? <Inbox className={compact ? "h-5 w-5" : "h-6 w-6"} />}
      </div>
      <h3 className={cn("font-semibold text-foreground mb-1", compact ? "text-base" : "text-lg")}>
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
