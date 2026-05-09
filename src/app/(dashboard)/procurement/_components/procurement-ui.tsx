"use client";

import Link from "next/link";
import { type ElementType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export const REQUEST_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CONVERTED", label: "Converted" },
];

export const ORDER_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PARTIALLY_RECEIVED", label: "Partially Received" },
  { value: "RECEIVED", label: "Received" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 2) {
  return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits });
}

export function formatMoney(value: number | null | undefined, currency = "USD") {
  if (value == null) return "-";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function formatStatus(value: string) {
  return value.replace(/_/g, " ");
}

export function priorityClass(priority: string): string {
  switch (priority) {
    case "URGENT":
      return "bg-red-100 text-red-700";
    case "HIGH":
      return "bg-orange-100 text-orange-700";
    case "NORMAL":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
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

