"use client";

import { Button } from "@/components/ui/button";

export type LineFamilyValue = "ALL" | "BREWING" | "SPIRITS";

const OPTIONS: { value: LineFamilyValue; label: string }[] = [
  { value: "ALL", label: "All lines" },
  { value: "BREWING", label: "Brewing" },
  { value: "SPIRITS", label: "Spirits" },
];

export function LineFamilyFilter({
  value,
  onChange,
}: {
  value: LineFamilyValue;
  onChange: (next: LineFamilyValue) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Line family">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          size="sm"
          variant={value === opt.value ? "default" : "outline"}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
