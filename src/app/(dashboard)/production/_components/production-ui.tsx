"use client";

import Link from "next/link";
import { type ElementType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const LINE_TYPES = [
  { value: "BREWING", label: "Brewing" },
  { value: "SPIRITS", label: "Spirits" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "PROCESSING", label: "Processing" },
  { value: "OTHER", label: "Other" },
];

/** Recipe / BOM line families (maps to ProductionBatch.batchType). */
export const RECIPE_LINE_FAMILIES = [
  { value: "BREWING", label: "Brewing" },
  { value: "SPIRITS", label: "Spirits" },
];

export const BATCH_STATUSES = [
  { value: "PLANNED", label: "Planned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 2) {
  return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function formatStatus(value: string) {
  return value.replace(/_/g, " ");
}

export function qty(value: number | null | undefined, uom = "") {
  return `${formatNumber(value)}${uom ? ` ${uom}` : ""}`;
}


/** Allow typing decimals without type=number fighting the controlled value. */
export function sanitizeDecimalInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return parts[0] + "." + parts.slice(1).join("");
}


export function StatCard({
  title,
  value,
  icon: Icon,
  href,
  highlight,
}: {
  title: string;
  value: number | string;
  icon: ElementType;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <Card className={highlight ? "border-amber-400" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? "text-amber-500" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${highlight ? "text-amber-600" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="transition-opacity hover:opacity-90">
      {inner}
    </Link>
  );
}

