import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Could not load data",
  description = "Something went wrong while loading this page. You can try again.",
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const detail =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center gap-4 px-4",
        className
      )}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        {detail && (
          <p className="text-xs text-muted-foreground font-mono bg-muted px-2.5 py-1 rounded mt-2 truncate">
            {detail}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
