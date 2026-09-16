import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AccessDeniedProps {
  title?: string;
  description?: string;
  className?: string;
  showHome?: boolean;
}

export function AccessDenied({
  title = "Access denied",
  description = "You do not have permission to view this page. Ask an administrator if you need access.",
  className,
  showHome = true,
}: AccessDeniedProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center px-4",
        className
      )}
      role="alert"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <ShieldOff className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {showHome && (
        <Button variant="outline" asChild>
          <Link href="/">Back to dashboard</Link>
        </Button>
      )}
    </div>
  );
}
