"use client";

import Link from "next/link";
import { type ElementType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const FUEL_TYPES = [
  { value: "DIESEL", label: "Diesel" },
  { value: "PETROL", label: "Petrol" },
  { value: "KEROSENE", label: "Kerosene" },
  { value: "LPG", label: "LPG" },
];

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 2) {
  return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits });
}

export function formatLiters(value: number | null | undefined) {
  return `${formatNumber(value)} L`;
}

export function formatMoney(value: number | null | undefined) {
  if (value == null) return "-";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function FuelLevelBadge({
  currentLevel,
  capacity,
  minLevel,
}: {
  currentLevel: number;
  capacity: number;
  minLevel?: number | null;
}) {
  const pct = capacity > 0 ? Math.round((currentLevel / capacity) * 100) : 0;
  const variant = currentLevel <= (minLevel ?? 0) ? "destructive" : pct <= 25 ? "warning" : "success";
  return (
    <div className="min-w-[120px] space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Badge variant={variant}>{pct}%</Badge>
        <span className="text-xs text-muted-foreground">{formatLiters(currentLevel)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
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

