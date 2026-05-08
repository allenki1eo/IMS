import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingState({ className, text = "Loading..." }: { className?: string; text?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-16 gap-3 text-muted-foreground", className)}>
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}
