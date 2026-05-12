"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertCircle, ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OutstandingPayment {
  id: string;
  reference: string;
  paymentDate: string;
  daysOverdue: number;
  counterparty: string | null;
  description: string | null;
  amount: number;
  paidAmount: number;
  outstanding: number;
  currency: string;
  bankAccount: string | null;
}

interface OutstandingData {
  payments: OutstandingPayment[];
  totalOutstanding: number;
  overdueCount: number;
  count: number;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function ageBadge(days: number) {
  if (days === 0) return <Badge variant="outline">Current</Badge>;
  if (days <= 30) return <Badge variant="secondary">{days}d overdue</Badge>;
  if (days <= 60) return <Badge className="bg-amber-100 text-amber-800 border-amber-300">{days}d overdue</Badge>;
  return <Badge variant="destructive">{days}d overdue</Badge>;
}

export default function OutstandingPage() {
  const [tab, setTab] = useState<"payable" | "receivable">("payable");
  const [data, setData] = useState<OutstandingData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (type: "payable" | "receivable") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/outstanding?type=${type}`);
      const json = await res.json();
      if (res.ok) setData(json.data);
      else toast.error(json.error ?? "Failed to load");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(tab); }, [tab, fetchData]);

  const isPayable = tab === "payable";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outstanding"
        description="Pending payables and receivables"
        actions={
          <Button variant="outline" onClick={() => fetchData(tab)} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        }
      />

      {/* Tab strip */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("payable")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "payable" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowUpCircle className="h-4 w-4" />
          Payables (We Owe)
        </button>
        <button
          onClick={() => setTab("receivable")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "receivable" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowDownCircle className="h-4 w-4" />
          Receivables (Owed to Us)
        </button>
      </div>

      {loading && <LoadingState text="Loading…" />}

      {data && !loading && (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className={`border-l-4 ${isPayable ? "border-l-red-500" : "border-l-emerald-500"}`}>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground">
                  Total {isPayable ? "Payable" : "Receivable"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold tabular-nums ${isPayable ? "text-red-700" : "text-emerald-700"}`}>
                  {fmt(data.totalOutstanding)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground">Pending Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.count}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground">Overdue Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">{data.overdueCount}</div>
              </CardContent>
            </Card>
          </div>

          {data.payments.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-3 h-10 w-10 opacity-30" />
                No outstanding {isPayable ? "payables" : "receivables"}.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-y bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {isPayable ? "Payable To" : "Receivable From"}
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Age</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Amount</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Paid</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Outstanding</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((p) => (
                        <tr
                          key={p.id}
                          className={`border-b transition-colors hover:bg-muted/30 ${
                            p.daysOverdue > 60 ? "bg-red-50/30 dark:bg-red-950/10" :
                            p.daysOverdue > 30 ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                          }`}
                        >
                          <td className="px-4 py-3 font-mono text-xs font-medium">
                            {p.reference}
                          </td>
                          <td className="px-4 py-3">
                            {p.counterparty || <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{fmtDate(p.paymentDate)}</td>
                          <td className="px-4 py-3">{ageBadge(p.daysOverdue)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className="text-xs text-muted-foreground mr-1">{p.currency}</span>
                            {fmt(p.amount)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                            {p.paidAmount > 0 ? fmt(p.paidAmount) : "—"}
                          </td>
                          <td className={`px-4 py-3 text-right tabular-nums font-semibold ${isPayable ? "text-red-700" : "text-emerald-700"}`}>
                            {fmt(p.outstanding)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                              <Link href={`/finance/payments/${p.id}`}>View</Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-muted/30">
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-right font-bold">Total Outstanding</td>
                        <td className={`px-4 py-3 text-right tabular-nums font-bold ${isPayable ? "text-red-700" : "text-emerald-700"}`}>
                          {fmt(data.totalOutstanding)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
