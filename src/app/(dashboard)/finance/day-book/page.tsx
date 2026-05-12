"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BookOpen, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface DayBookEntry {
  id: string;
  reference: string;
  entryDate: string;
  description: string;
  voucherType: string;
  totalDebit: number;
  totalCredit: number;
  lines: {
    id: string;
    description: string;
    debit: number;
    credit: number;
    account: { code: string; name: string };
  }[];
}

const VOUCHER_COLORS: Record<string, string> = {
  JOURNAL: "bg-blue-100 text-blue-800",
  PAYMENT: "bg-red-100 text-red-800",
  RECEIPT: "bg-emerald-100 text-emerald-800",
  CONTRA: "bg-purple-100 text-purple-800",
  SALES: "bg-amber-100 text-amber-800",
  PURCHASE: "bg-orange-100 text-orange-800",
  DEBIT_NOTE: "bg-rose-100 text-rose-800",
  CREDIT_NOTE: "bg-teal-100 text-teal-800",
};

function today() { return new Date().toISOString().split("T")[0]; }
function firstOfMonth() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().split("T")[0];
}
function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function groupByDate(entries: DayBookEntry[]) {
  const map = new Map<string, DayBookEntry[]>();
  for (const e of entries) {
    const key = e.entryDate.split("T")[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return map;
}

export default function DayBookPage() {
  const [fromDate, setFromDate] = useState(firstOfMonth());
  const [toDate, setToDate] = useState(today());
  const [voucherType, setVoucherType] = useState("");
  const [data, setData] = useState<{ entries: DayBookEntry[]; totalDebit: number; totalCredit: number; count: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchDayBook() {
    if (!fromDate || !toDate) { toast.error("Select both dates"); return; }
    if (fromDate > toDate) { toast.error("From date must be before to date"); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ fromDate, toDate });
      if (voucherType) params.set("voucherType", voucherType);
      const res = await fetch(`/api/finance/day-book?${params}`);
      const json = await res.json();
      if (res.ok) setData(json.data);
      else toast.error(json.error ?? "Failed to load day book");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  const byDate = data ? groupByDate(data.entries) : new Map();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Day Book"
        description="All posted vouchers for a date range — Tally-style view"
        actions={
          data ? (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>Voucher Type</Label>
              <select
                value={voucherType}
                onChange={(e) => setVoucherType(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="JOURNAL">Journal</option>
                <option value="PAYMENT">Payment</option>
                <option value="RECEIPT">Receipt</option>
                <option value="CONTRA">Contra</option>
                <option value="SALES">Sales</option>
                <option value="PURCHASE">Purchase</option>
                <option value="DEBIT_NOTE">Debit Note</option>
                <option value="CREDIT_NOTE">Credit Note</option>
              </select>
            </div>
            <Button onClick={fetchDayBook} disabled={loading}>
              {loading ? "Loading…" : "Show Day Book"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && <LoadingState text="Loading day book…" />}

      {data && !loading && (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Vouchers</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{data.count}</div></CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Debit</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold tabular-nums">{fmt(data.totalDebit)}</div></CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Credit</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold tabular-nums">{fmt(data.totalCredit)}</div></CardContent>
            </Card>
          </div>

          {data.entries.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-30" />
                No posted vouchers for this period.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Array.from(byDate.entries()).map(([date, entries]) => {
                const dayDr = entries.reduce((s, e) => s + e.totalDebit, 0);
                const dayCr = entries.reduce((s, e) => s + e.totalCredit, 0);
                return (
                  <div key={date}>
                    {/* Date header */}
                    <div className="mb-2 flex items-center justify-between rounded-md bg-muted/60 px-4 py-2">
                      <span className="font-semibold">{fmtDate(date)}</span>
                      <span className="text-sm text-muted-foreground">
                        Dr {fmt(dayDr)} &nbsp;·&nbsp; Cr {fmt(dayCr)}
                      </span>
                    </div>

                    {/* Entries for this date */}
                    <div className="space-y-3">
                      {entries.map((entry) => (
                        <Card key={entry.id} className="overflow-hidden">
                          <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
                            <div className="flex items-center gap-3">
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-bold ${
                                  VOUCHER_COLORS[entry.voucherType] ?? "bg-muted text-muted-foreground"
                                }`}
                              >
                                {entry.voucherType}
                              </span>
                              <Link
                                href={`/finance/journal-entries/${entry.id}`}
                                className="font-mono text-sm font-medium hover:underline"
                              >
                                {entry.reference}
                              </Link>
                              <span className="text-sm text-muted-foreground">{entry.description}</span>
                            </div>
                            <div className="text-sm font-medium">
                              {fmt(entry.totalDebit)}
                            </div>
                          </div>
                          <table className="w-full text-sm">
                            <tbody>
                              {entry.lines.map((line) => (
                                <tr key={line.id} className="border-b last:border-0 hover:bg-muted/20">
                                  <td className="py-1.5 pl-6 pr-4 text-muted-foreground">
                                    {line.debit > 0 ? "" : <span className="mr-4 opacity-0">—</span>}
                                    <span className="font-mono text-xs">{line.account.code}</span>
                                    {" — "}
                                    {line.account.name}
                                    {line.description ? ` (${line.description})` : ""}
                                  </td>
                                  <td className="py-1.5 pr-4 text-right tabular-nums text-blue-700 w-28">
                                    {line.debit > 0 ? fmt(line.debit) : ""}
                                  </td>
                                  <td className="py-1.5 pr-4 text-right tabular-nums text-emerald-700 w-28">
                                    {line.credit > 0 ? fmt(line.credit) : ""}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Grand total */}
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-6 py-4 font-bold">
                <span>Grand Total</span>
                <div className="flex gap-8">
                  <span className="tabular-nums text-blue-700">Dr {fmt(data.totalDebit)}</span>
                  <span className="tabular-nums text-emerald-700">Cr {fmt(data.totalCredit)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
