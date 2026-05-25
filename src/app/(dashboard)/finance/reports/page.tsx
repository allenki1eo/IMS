"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileBarChart, TrendingUp, Scale } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/shared/LoadingState";

type ReportType = "trial" | "income" | "balance";

function today() {
  return new Date().toISOString().split("T")[0];
}

function firstOfYear() {
  return `${new Date().getFullYear()}-01-01`;
}

export default function FinancialReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("trial");
  // Dates are kept as shared state so they survive tab switches
  const [fromDate, setFromDate] = useState(firstOfYear());
  const [toDate, setToDate] = useState(today());
  const [asOfDate, setAsOfDate] = useState(today());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  function switchTab(type: ReportType) {
    setReportType(type);
    setData(null); // clear result but keep dates
  }

  async function fetchReport() {
    setLoading(true);
    try {
      let url = "";
      if (reportType === "trial") {
        url = "/api/finance/reports/trial-balance";
      } else if (reportType === "income") {
        if (!fromDate || !toDate) {
          toast.error("Please select from and to dates");
          return;
        }
        if (fromDate > toDate) {
          toast.error("From date must be before to date");
          return;
        }
        url = `/api/finance/reports/income-statement?fromDate=${fromDate}&toDate=${toDate}`;
      } else {
        url = `/api/finance/reports/balance-sheet?asOfDate=${asOfDate}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
      } else {
        toast.error(json.message || "Failed to load report");
      }
    } catch {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  const TABS: { type: ReportType; label: string; icon: React.ReactNode }[] = [
    { type: "trial", label: "Trial Balance", icon: <Scale className="h-4 w-4" /> },
    { type: "income", label: "Income Statement", icon: <TrendingUp className="h-4 w-4" /> },
    { type: "balance", label: "Balance Sheet", icon: <FileBarChart className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Reports" description="Trial balance, income statement, and balance sheet" />

      {/* Tab strip */}
      <div className="flex gap-2 border-b pb-0">
        {TABS.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => switchTab(type)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              reportType === type
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Date controls — always visible, values persist */}
      <div className="flex flex-wrap items-end gap-4">
        {reportType === "income" && (
          <>
            <div className="space-y-1.5">
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
            </div>
          </>
        )}
        {reportType === "balance" && (
          <div className="space-y-1.5">
            <Label>As Of Date</Label>
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-40" />
          </div>
        )}
        {reportType === "trial" && (
          <p className="text-sm text-muted-foreground">Shows current balances for all active accounts.</p>
        )}
        <Button onClick={fetchReport} disabled={loading}>
          {loading ? "Generating…" : "Generate Report"}
        </Button>
      </div>

      {loading && <LoadingState text="Generating report…" />}

      {/* Trial Balance */}
      {data && reportType === "trial" && (
        <Card>
          <CardHeader>
            <CardTitle>Trial Balance</CardTitle>
            <p className={`text-sm font-medium ${data.isBalanced ? "text-emerald-600" : "text-red-600"}`}>
              {data.isBalanced ? "Balanced ✓" : "Unbalanced ✗"} &nbsp;·&nbsp; Total Debit:{" "}
              {data.totalDebit.toLocaleString()} &nbsp;·&nbsp; Total Credit: {data.totalCredit.toLocaleString()}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Debit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Credit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row: any) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                      <td className="px-4 py-2">{row.name}</td>
                      <td className="px-4 py-2">
                        <span className="rounded bg-muted px-2 py-0.5 text-xs">{row.accountType}</span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.totalDebit > 0 ? row.totalDebit.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.totalCredit > 0 ? row.totalCredit.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">
                        {row.netBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income Statement */}
      {data && reportType === "income" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Income Statement</CardTitle>
              <p className="text-sm text-muted-foreground">
                {data.fromDate} to {data.toDate}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <section>
                <h3 className="mb-2 font-semibold text-emerald-700">Revenue</h3>
                {data.revenue.map((r: any) => (
                  <div key={r.code} className="flex justify-between border-b py-1.5 text-sm">
                    <span className="text-muted-foreground">
                      {r.code} — {r.name}
                    </span>
                    <span className="tabular-nums">{r.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold">
                  <span>Total Revenue</span>
                  <span className="tabular-nums text-emerald-700">{data.totalRevenue.toLocaleString()}</span>
                </div>
              </section>

              <section>
                <h3 className="mb-2 font-semibold text-red-700">Expenses</h3>
                {data.expenses.map((r: any) => (
                  <div key={r.code} className="flex justify-between border-b py-1.5 text-sm">
                    <span className="text-muted-foreground">
                      {r.code} — {r.name}
                    </span>
                    <span className="tabular-nums">{r.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold">
                  <span>Total Expenses</span>
                  <span className="tabular-nums text-red-700">{data.totalExpenses.toLocaleString()}</span>
                </div>
              </section>

              <div
                className={`flex justify-between rounded-lg border p-4 text-lg font-bold ${
                  data.netIncome >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                }`}
              >
                <span>Net {data.netIncome >= 0 ? "Profit" : "Loss"}</span>
                <span className="tabular-nums">{Math.abs(data.netIncome).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Balance Sheet */}
      {data && reportType === "balance" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
              <p className={`text-sm font-medium ${data.isBalanced ? "text-emerald-600" : "text-red-600"}`}>
                {data.isBalanced ? "Balanced ✓" : "Unbalanced ✗"} &nbsp;·&nbsp; As of {data.asOfDate}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { label: "Assets", items: data.assets, total: data.totalAssets, color: "text-blue-700" },
                { label: "Liabilities", items: data.liabilities, total: data.totalLiabilities, color: "text-red-700" },
                { label: "Equity", items: data.equity, total: data.totalEquity, color: "text-purple-700" },
              ].map(({ label, items, total, color }) => (
                <section key={label}>
                  <h3 className={`mb-2 font-semibold ${color}`}>{label}</h3>
                  {items.map((r: any) => (
                    <div key={r.id} className="flex justify-between border-b py-1.5 text-sm">
                      <span className="text-muted-foreground">
                        {r.code} — {r.name}
                      </span>
                      <span className="tabular-nums">{r.balance.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className={`flex justify-between pt-2 font-bold ${color}`}>
                    <span>Total {label}</span>
                    <span className="tabular-nums">{total.toLocaleString()}</span>
                  </div>
                </section>
              ))}
              <div className="flex justify-between rounded-lg border bg-muted/40 p-4 text-base font-bold">
                <span>Total Liabilities + Equity</span>
                <span className="tabular-nums">{data.totalLiabilitiesAndEquity.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
