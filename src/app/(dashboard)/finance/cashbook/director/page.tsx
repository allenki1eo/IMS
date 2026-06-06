"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

interface BankAccountRow {
  id: string;
  name: string;
  bankName: string | null;
  currency: string;
  currentBalance: number;
}

interface CompanySummary {
  company: { id: string; name: string };
  bankAccounts: BankAccountRow[];
  totalBalance: number;
  periodReceipts: number;
  periodPayments: number;
}

function fmtAmount(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CompanyCard({ summary }: { summary: CompanySummary }) {
  const [expanded, setExpanded] = useState(false);
  const net = summary.periodReceipts - summary.periodPayments;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{summary.company.name}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {expanded ? "Hide" : "Accounts"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Total Balance</p>
            <p className={`font-bold text-base ${summary.totalBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
              {fmtAmount(summary.totalBalance)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Period Receipts</p>
            <p className="font-semibold text-green-600">{fmtAmount(summary.periodReceipts)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Period Payments</p>
            <p className="font-semibold text-red-600">{fmtAmount(summary.periodPayments)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Net Movement</p>
            <p className={`font-semibold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmtAmount(net)}
            </p>
          </div>
        </div>

        {expanded && summary.bankAccounts.length > 0 && (
          <div className="border-t pt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 font-medium text-muted-foreground">Account</th>
                  <th className="text-left py-1 font-medium text-muted-foreground">Bank</th>
                  <th className="text-left py-1 font-medium text-muted-foreground">Currency</th>
                  <th className="text-right py-1 font-medium text-muted-foreground">Balance</th>
                </tr>
              </thead>
              <tbody>
                {summary.bankAccounts.map((a) => (
                  <tr key={a.id} className="border-b border-muted last:border-0">
                    <td className="py-1.5 font-medium">{a.name}</td>
                    <td className="py-1.5 text-muted-foreground">{a.bankName ?? "—"}</td>
                    <td className="py-1.5 text-muted-foreground">{a.currency}</td>
                    <td className={`py-1.5 text-right font-medium ${a.currentBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {fmtAmount(a.currentBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {expanded && summary.bankAccounts.length === 0 && (
          <p className="text-sm text-muted-foreground italic pt-2">No active bank accounts</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DirectorCashbookPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(startOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [summaries, setSummaries] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      const res = await fetch(`/api/finance/cashbook/director?${params}`);
      const json = await res.json();
      if (json.success) setSummaries(json.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const grandBalance = summaries.reduce((s, c) => s + c.totalBalance, 0);
  const grandReceipts = summaries.reduce((s, c) => s + c.periodReceipts, 0);
  const grandPayments = summaries.reduce((s, c) => s + c.periodPayments, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <PageHeader
          title="Director Cashbook View"
          description="Cross-company cashbook overview with period-level summaries"
        />
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
          </div>
          <Button variant="outline" onClick={loadData}>Apply</Button>
        </div>
      </div>

      {loading ? (
        <LoadingState text="Loading director summary..." />
      ) : summaries.length === 0 ? (
        <EmptyState title="No companies found" description="No company data available." />
      ) : (
        <>
          {/* Company Cards */}
          <div className="grid grid-cols-1 gap-4">
            {summaries.map((s) => (
              <CompanyCard key={s.company.id} summary={s} />
            ))}
          </div>

          {/* Grand Total */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-base">Grand Total — All Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Combined Balance</p>
                  <p className={`font-bold text-xl ${grandBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {fmtAmount(grandBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Period Receipts</p>
                  <p className="font-bold text-lg text-green-600">{fmtAmount(grandReceipts)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Period Payments</p>
                  <p className="font-bold text-lg text-red-600">{fmtAmount(grandPayments)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Net Movement</p>
                  <p className={`font-bold text-lg ${grandReceipts - grandPayments >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmtAmount(grandReceipts - grandPayments)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
