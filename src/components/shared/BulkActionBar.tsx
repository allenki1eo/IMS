"use client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline";
  loading?: boolean;
}

interface BulkActionBarProps {
  selected: string[];
  onClear: () => void;
  actions: BulkAction[];
  className?: string;
}

export function BulkActionBar({ selected, onClear, actions, className }: BulkActionBarProps) {
  if (selected.length === 0) return null;
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 mb-3 rounded-lg border bg-primary/5 border-primary/20",
      className
    )}>
      <span className="text-sm font-medium text-primary">{selected.length} selected</span>
      <div className="flex items-center gap-2 ml-auto">
        {actions.map((action) => (
          <Button
            key={action.label}
            size="sm"
            variant={action.variant ?? "outline"}
            onClick={action.onClick}
            disabled={action.loading}
          >
            {action.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={onClear} className="ml-1">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
