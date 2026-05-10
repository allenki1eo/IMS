"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/shared/LoadingState";

export default function FinancialReportsPage() {
  const [reportType, setReportType] = useState<"trial" | "income" | "balance">("trial");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function fetchReport() {
    setLoading(true);
    try {
      let url = "";
      if (reportType === "trial") {
        url = "/api/finance/reports/trial-balance";
      } else if (reportType === "income") {
        if (!fromDate || !toDate) {
          toast.error("Please select from and to dates");
          setLoading(false);
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

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Reports" description="Trial balance, income statement, and balance sheet" />

      <div className="flex gap-2">
        <Button variant={reportType === "trial" ? "default" : "outline"} onClick={() => { setReportType("trial"); setData(null); }}>Trial Balance</Button>
        <Button variant={reportType === "income" ? "default" : "outline"} onClick={() => { setReportType("income"); setData(null); }}>Income Statement</Button>
        <Button variant={reportType === "balance" ? "default" : "outline"} onClick={() => { setReportType("balance"); setData(null); }}>Balance Sheet</Button>
      </div>

      <div className="flex gap-4 items-end">
        {reportType === "income" && (
          <>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </>
        )}
        {reportType === "balance" && (
          <div className="space-y-2">
            <Label>As Of Date</Label>
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
          </div>
        )}
        <Button onClick={fetchReport} disabled={loading}>{loading ? "Loading..." : "Generate Report"}</Button>
      </div>

      {loading && <LoadingState message="Generating report..." />}

      {data && reportType === "trial" && (
        <Card>
          <CardHeader>
            <CardTitle>Trial Balance</CardTitle>
            <div className={`text-sm font-medium ${data.isBalanced ? "text-green-600" : "text-red-600"}`}>
              {data.isBalanced ? "Balanced" : "Unbalanced"} | Total Debit: ${data.totalDebit.toLocaleString()} | Total Credit: ${data.totalCredit.toLocaleString()}
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="px-4 py-2 text-left">Code</th><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-right">Debit</th><th className="px-4 py-2 text-right">Credit</th><th className="px-4 py-2 text-right">Balance</th></tr></thead>
              <tbody>
                {data.data.map((row: any) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-2">{row.code}</td>
                    <td className="px-4 py-2">{row.name}</td>
                    <td className="px-4 py-2"><span className="text-xs bg-muted px-2 py-1 rounded">{row.accountType}</span></td>
                    <td className="px-4 py-2 text-right">{row.totalDebit > 0 ? `$${row.totalDebit.toLocaleString()}` : "-"}</td>
                    <td className="px-4 py-2 text-right">{row.totalCredit > 0 ? `$${row.totalCredit.toLocaleString()}` : "-"}</td>
                    <td className="px-4 py-2 text-right">${row.netBalance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {data && reportType === "income" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Income Statement</CardTitle><div className="text-sm text-muted-foreground">{data.fromDate} to {data.toDate}</div></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Revenue</h3>
                {data.revenue.map((r: any) => (
                  <div key={r.code} className="flex justify-between py-1"><span>{r.code} - {r.name}</span><span>${r.amount.toLocaleString()}</span></div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2"><span>Total Revenue</span><span>${data.totalRevenue.toLocaleString()}</span></div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Expenses</h3>
                {data.expenses.map((r: any) => (
                  <div key={r.code} className="flex justify-between py-1"><span>{r.code} - {r.name}</span><span>${r.amount.toLocaleString()}</span></div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2"><span>Total Expenses</span><span>${data.totalExpenses.toLocaleString()}</span></div>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-4">
                <span>Net Income</span>
                <span className={data.netIncome >= 0 ? "text-green-600" : "text-red-600"}>${data.netIncome.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {data && reportType === "balance" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
              <div className={`text-sm font-medium ${data.isBalanced ? "text-green-600" : "text-red-600"}`}>
                {data.isBalanced ? "Balanced" : "Unbalanced"} | As of {data.asOfDate}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Assets</h3>
                {data.assets.map((r: any) => (
                  <div key={r.id} className="flex justify-between py-1"><span>{r.code} - {r.name}</span><span>${r.balance.toLocaleString()}</span></div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2"><span>Total Assets</span><span>${data.totalAssets.toLocaleString()}</span></div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Liabilities</h3>
                {data.liabilities.map((r: any) => (
                  <div key={r.id} className="flex justify-between py-1"><span>{r.code} - {r.name}</span><span>${r.balance.toLocaleString()}</span></div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2"><span>Total Liabilities</span><span>${data.totalLiabilities.toLocaleString()}</span></div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Equity</h3>
                {data.equity.map((r: any) => (
                  <div key={r.id} className="flex justify-between py-1"><span>{r.code} - {r.name}</span><span>${r.balance.toLocaleString()}</span></div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2"><span>Total Equity</span><span>${data.totalEquity.toLocaleString()}</span></div>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-4">
                <span>Total Liabilities + Equity</span>
                <span>${data.totalLiabilitiesAndEquity.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
