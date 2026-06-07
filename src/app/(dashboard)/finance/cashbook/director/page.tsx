"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Printer, ExternalLink } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

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

interface CashbookEntry {
  id: string;
  description: string;
  counterparty: string | null;
  chequeRef: string | null;
  paymentMethod: string;
  amount: number;
  pvNumber: number | null;
  type: string;
}

interface CompanyDailyData {
  company: { id: string; name: string };
  openingBalance: number;
  bankReceipts: CashbookEntry[];    // cheque/online/bank-transfer receipts
  cashReceipts: CashbookEntry[];    // cash/petty-cash receipts
  totalBankReceipts: number;
  totalCashReceipts: number;
  totalReceipts: number;
  totalExpenses: number;            // sum only — itemised in company summary
  grossClosingBalance: number;
}

interface DailySummary {
  mode: "daily";
  date: string;
  companies: CompanyDailyData[];
  grandTotal: {
    openingBalance: number;
    totalReceipts: number;
    totalExpenses: number;
    grossClosingBalance: number;
  };
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function fmtAmount(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function chequeOrRef(entry: CashbookEntry): string {
  if (entry.chequeRef) return entry.chequeRef;
  if (entry.paymentMethod === "CHEQUE") return "Cheque";
  if (entry.paymentMethod === "ONLINE") return "Online";
  if (entry.paymentMethod === "BANK_TRANSFER") return "Bank";
  return entry.paymentMethod;
}

/* ─── Period Summary Sub-components ─────────────────────────────────────────── */

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

/* ─── Daily View ─────────────────────────────────────────────────────────────── */

function DailyView() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/cashbook/director?date=${date}`);
      const json = await res.json();
      if (json.success) setData(json.data ?? null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          table { font-size: 11px; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 3px 6px; }
          .sig-section { margin-top: 40px; }
        }
      `}</style>

      <div className="space-y-4">
        {/* Controls */}
        <div className="no-print flex items-center gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button variant="outline" className="mt-5" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>

        {loading ? (
          <LoadingState text="Loading daily director view..." />
        ) : !data || data.companies.length === 0 ? (
          <EmptyState title="No data" description="No company data for this date." />
        ) : (
          <>
            {/* Document title */}
            <div className="text-center mb-2">
              <h1 className="text-xl font-bold uppercase tracking-wider">SUMMARY</h1>
              <h2 className="text-base font-semibold mt-0.5 uppercase">REQUEST FOR: {displayDate}</h2>
            </div>

            <table className="w-full border-collapse border border-black text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-3 py-2 text-left font-bold">PARTICULARS</th>
                  <th className="border border-black px-3 py-2 text-left font-bold w-36">CHEQUE NO. / REF</th>
                  <th className="border border-black px-3 py-2 text-right font-bold w-36">PETTY CASH</th>
                  <th className="border border-black px-3 py-2 text-right font-bold w-36">EXPENSES</th>
                </tr>
              </thead>
              <tbody>
                {/* ── Opening Balance ──────────────────────────────────────────── */}
                <tr className="font-semibold bg-gray-50">
                  <td className="border border-black px-3 py-1.5" colSpan={2}>OPENING BALANCE</td>
                  <td className="border border-black px-3 py-1.5 text-right">{fmtAmount(data.grandTotal.openingBalance)}</td>
                  <td className="border border-black px-3 py-1.5" />
                </tr>

                {/* ── Per-company bank receipt sections ───────────────────────── */}
                {data.companies.map((cd) => (
                  <>
                    {/* Company section header with drill-down link */}
                    <tr key={`hdr-${cd.company.id}`} className="bg-blue-100">
                      <td
                        colSpan={3}
                        className="border border-black px-3 py-1.5 font-bold uppercase text-xs tracking-wide"
                      >
                        {cd.company.name}
                      </td>
                      <td className="border border-black px-3 py-1.5 text-right no-print">
                        <Link
                          href={`/finance/cashbook/summary?date=${date}&companyId=${cd.company.id}`}
                          className="text-blue-600 hover:text-blue-800 flex items-center justify-end gap-1 text-xs"
                        >
                          View Details
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                      {/* print-only: empty cell */}
                      <td className="border border-black px-3 py-1.5 hidden print:table-cell" />
                    </tr>

                    {/* Bank receipt rows (cheque / online / bank transfer) */}
                    {cd.bankReceipts.map((entry) => (
                      <tr key={entry.id}>
                        <td className="border border-black px-3 py-1">
                          {entry.description}
                          {entry.counterparty ? ` — ${entry.counterparty}` : ""}
                        </td>
                        <td className="border border-black px-3 py-1 font-mono text-xs">
                          {chequeOrRef(entry)}
                        </td>
                        <td className="border border-black px-3 py-1 text-right">
                          {fmtAmount(entry.amount)}
                        </td>
                        <td className="border border-black px-3 py-1" />
                      </tr>
                    ))}

                    {/* Company bank-receipt subtotal */}
                    <tr key={`sub-${cd.company.id}`} className="font-semibold bg-gray-50">
                      <td colSpan={2} className="border border-black px-3 py-1 text-right text-xs uppercase">
                        TOTAL CHEQUE {cd.company.name.toUpperCase()}
                      </td>
                      <td className="border border-black px-3 py-1 text-right">
                        {cd.totalBankReceipts > 0 ? fmtAmount(cd.totalBankReceipts) : ""}
                      </td>
                      <td className="border border-black px-3 py-1" />
                    </tr>
                  </>
                ))}

                {/* ── Cash Received section ────────────────────────────────────── */}
                <tr className="bg-green-50 font-bold">
                  <td colSpan={4} className="border border-black px-3 py-1.5 uppercase text-xs tracking-wide">
                    CASH RECEIVED
                  </td>
                </tr>
                {data.companies.map((cd) =>
                  cd.cashReceipts.map((entry) => (
                    <tr key={entry.id}>
                      <td className="border border-black px-3 py-1">
                        CASH RECEIVED({cd.company.name.toUpperCase()})
                        {entry.counterparty ? ` — ${entry.counterparty}` : ""}
                      </td>
                      <td className="border border-black px-3 py-1 font-mono text-xs">
                        {chequeOrRef(entry)}
                      </td>
                      <td className="border border-black px-3 py-1 text-right">
                        {fmtAmount(entry.amount)}
                      </td>
                      <td className="border border-black px-3 py-1" />
                    </tr>
                  ))
                )}
                <tr className="font-semibold bg-gray-50">
                  <td colSpan={2} className="border border-black px-3 py-1 text-right text-xs uppercase">
                    TOTAL CASH RECEIVED
                  </td>
                  <td className="border border-black px-3 py-1 text-right">
                    {fmtAmount(data.companies.reduce((s, c) => s + c.totalCashReceipts, 0))}
                  </td>
                  <td className="border border-black px-3 py-1" />
                </tr>

                {/* ── Per-company expense totals (right column) ────────────────── */}
                {data.companies
                  .filter((cd) => cd.totalExpenses > 0)
                  .map((cd) => (
                    <tr key={`exp-${cd.company.id}`}>
                      <td className="border border-black px-3 py-1" colSpan={3}>
                        {cd.company.name}
                      </td>
                      <td className="border border-black px-3 py-1 text-right">
                        {fmtAmount(cd.totalExpenses)}
                      </td>
                    </tr>
                  ))}

                {/* ── Overall Total ────────────────────────────────────────────── */}
                <tr className="font-bold bg-gray-100">
                  <td colSpan={2} className="border border-black px-3 py-2 text-right uppercase">
                    OVERALL TOTAL
                  </td>
                  <td className="border border-black px-3 py-2 text-right">
                    {fmtAmount(data.grandTotal.totalReceipts)}
                  </td>
                  <td className="border border-black px-3 py-2 text-right">
                    {fmtAmount(data.grandTotal.totalExpenses)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Below-table summary (matches physical doc) */}
            <div className="mt-4 text-sm space-y-1">
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium uppercase text-xs tracking-wide">Total Petty Cash / Cheque / Cash Received</span>
                <span className="font-semibold">{fmtAmount(data.grandTotal.totalReceipts)}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium uppercase text-xs tracking-wide">Total Expenses</span>
                <span className="font-semibold">{fmtAmount(data.grandTotal.totalExpenses)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1">
                <span className="uppercase tracking-wide">Gross Closing Balance</span>
                <span>{fmtAmount(data.grandTotal.grossClosingBalance)}</span>
              </div>
            </div>

            {/* Signature lines */}
            <div className="sig-section mt-12 grid grid-cols-2 gap-x-12 gap-y-10 pt-8">
              {["Prepared By", "Approved By", "Checked By", "Authorized By"].map((label) => (
                <div key={label}>
                  <p className="text-sm font-medium mb-6">{label}:</p>
                  <div
                    className="border-b border-gray-400 w-full"
                    style={{ borderBottomStyle: "dotted", borderBottomWidth: "2px" }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Signature &amp; Date</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─── Period Summary View ────────────────────────────────────────────────────── */

function PeriodSummaryView() {
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

      {loading ? (
        <LoadingState text="Loading director summary..." />
      ) : summaries.length === 0 ? (
        <EmptyState title="No companies found" description="No company data available." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {summaries.map((s) => (
              <CompanyCard key={s.company.id} summary={s} />
            ))}
          </div>

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

/* ─── Main Page ──────────────────────────────────────────────────────────────── */

type ViewMode = "daily" | "period";

export default function DirectorCashbookPage() {
  const [mode, setMode] = useState<ViewMode>("daily");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <PageHeader
          title="Director Cashbook View"
          description="Cross-company cashbook overview"
        />
        {/* Mode toggle */}
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => setMode("daily")}
            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              mode === "daily"
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400"
                : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
            }`}
          >
            Daily View
          </button>
          <button
            type="button"
            onClick={() => setMode("period")}
            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              mode === "period"
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400"
                : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
            }`}
          >
            Period Summary
          </button>
        </div>
      </div>

      {mode === "daily" ? <DailyView /> : <PeriodSummaryView />}
    </div>
  );
}
