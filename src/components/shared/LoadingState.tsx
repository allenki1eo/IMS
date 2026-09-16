import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingState({
  className,
  text = "Loading...",
}: {
  className?: string;
  text?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center py-16 gap-3 text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-hidden />;
}

/** Lightweight page skeleton matching common list/overview layouts */
export function PageLoadingSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-7 w-56 max-w-full animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted/60" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border bg-muted/60" />
    </div>
  );
}
