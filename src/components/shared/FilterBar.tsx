"use client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/SearchInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    options: FilterOption[];
    width?: string;
  }[];
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (v: string) => void;
  onDateToChange?: (v: string) => void;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onReset,
  hasActiveFilters,
  className,
  children,
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {onSearchChange !== undefined && (
        <SearchInput
          value={search ?? ""}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="w-full sm:w-56"
        />
      )}

      {filters.map((filter, i) => (
        <Select key={i} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className={cn("h-9", filter.width ?? "w-full sm:w-36")}>
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {(onDateFromChange || onDateToChange) && (
        <div className="flex flex-wrap items-center gap-1">
          {onDateFromChange && (
            <input
              type="date"
              value={dateFrom ?? ""}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring w-full sm:w-auto"
            />
          )}
          {onDateFromChange && onDateToChange && (
            <span className="text-muted-foreground text-xs hidden sm:inline">to</span>
          )}
          {onDateToChange && (
            <input
              type="date"
              value={dateTo ?? ""}
              onChange={(e) => onDateToChange(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring w-full sm:w-auto"
            />
          )}
        </div>
      )}

      {children}

      {onReset && hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground" onClick={onReset}>
          <X className="h-3.5 w-3.5" />
          Reset
        </Button>
      )}
    </div>
  );
}
