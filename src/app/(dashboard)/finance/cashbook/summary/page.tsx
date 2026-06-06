"use client";

import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

interface CashbookEntryRow {
  id: string;
  date: string;
  type: string;
  description: string;
  counterparty: string | null;
  reference: string | null;
  amount: number;
  bankAccountId: string;
  transferToId: string | null;
}

interface AccountSummary {
  account: {
    id: string;
    name: string;
    bankName: string | null;
    currency: string;
    currentBalance: number;
  };
  openingBalance: number;
  receipts: CashbookEntryRow[];
  payments: CashbookEntryRow[];
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  entries: CashbookEntryRow[];
}

function fmtAmount(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CashbookSummaryPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summaries, setSummaries] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("Company");

  useEffect(() => {
    fetch("/api/company")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.name) setCompanyName(d.data.name);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/finance/cashbook/summary?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSummaries(d.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date]);

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const grandTotalReceipts = summaries.reduce((s, x) => s + x.totalReceipts, 0);
  const grandTotalPayments = summaries.reduce((s, x) => s + x.totalPayments, 0);

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-container { padding: 0; }
          .print-header { margin-bottom: 24px; }
          table { font-size: 11px; }
        }
      `}</style>

      <div className="space-y-6 print-container">
        {/* Controls — hidden on print */}
        <div className="no-print flex items-center justify-between flex-wrap gap-3">
          <PageHeader title="Daily Summary" description="Print-ready daily cashbook summary by bank account" />
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" className="mt-4" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Print header */}
        <div className="print-header text-center hidden print:block">
          <h1 className="text-2xl font-bold">{companyName}</h1>
          <h2 className="text-lg font-semibold mt-1">Daily Cashbook Summary</h2>
          <p className="text-sm text-muted-foreground mt-1">{displayDate}</p>
        </div>

        {/* Screen date header */}
        <div className="no-print">
          <p className="text-muted-foreground text-sm">{displayDate}</p>
        </div>

        {loading ? (
          <LoadingState text="Loading daily summary..." />
        ) : summaries.length === 0 ? (
          <EmptyState title="No bank accounts" description="No active bank accounts found." />
        ) : (
          <div className="space-y-8">
            {summaries.map((s) => (
              <div key={s.account.id} className="border rounded-lg overflow-hidden">
                {/* Account Header */}
                <div className="bg-muted/50 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-semibold text-base">
                      {s.account.name}{s.account.bankName ? ` — ${s.account.bankName}` : ""}
                    </h3>
                    <p className="text-xs text-muted-foreground">{s.account.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Opening Balance</p>
                    <p className="font-semibold">{fmtAmount(s.openingBalance)}</p>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Receipts */}
                  {s.receipts.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-700 mb-2 text-sm uppercase tracking-wide">Receipts</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 font-medium text-muted-foreground">Description</th>
                            <th className="text-left py-1 font-medium text-muted-foreground">From</th>
                            <th className="text-left py-1 font-medium text-muted-foreground">Ref</th>
                            <th className="text-right py-1 font-medium text-muted-foreground">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.receipts.map((e) => (
                            <tr key={e.id} className="border-b border-muted">
                              <td className="py-1">{e.description}</td>
                              <td className="py-1 text-muted-foreground">{e.counterparty ?? "—"}</td>
                              <td className="py-1 text-muted-foreground">{e.reference ?? "—"}</td>
                              <td className="py-1 text-right text-green-600 font-medium">{fmtAmount(e.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3} className="py-2 font-semibold text-green-700">Total Receipts</td>
                            <td className="py-2 text-right font-bold text-green-700">{fmtAmount(s.totalReceipts)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {s.receipts.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No receipts today</p>
                  )}

                  {/* Payments */}
                  {s.payments.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-700 mb-2 text-sm uppercase tracking-wide">Payments</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 font-medium text-muted-foreground">Description</th>
                            <th className="text-left py-1 font-medium text-muted-foreground">To</th>
                            <th className="text-left py-1 font-medium text-muted-foreground">Ref</th>
                            <th className="text-right py-1 font-medium text-muted-foreground">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.payments.map((e) => (
                            <tr key={e.id} className="border-b border-muted">
                              <td className="py-1">{e.description}</td>
                              <td className="py-1 text-muted-foreground">{e.counterparty ?? "—"}</td>
                              <td className="py-1 text-muted-foreground">{e.reference ?? "—"}</td>
                              <td className="py-1 text-right text-red-600 font-medium">{fmtAmount(e.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3} className="py-2 font-semibold text-red-700">Total Payments</td>
                            <td className="py-2 text-right font-bold text-red-700">{fmtAmount(s.totalPayments)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {s.payments.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No payments today</p>
                  )}

                  {/* Closing Balance */}
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-semibold">Closing Balance</span>
                    <span className={`font-bold text-lg ${s.closingBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {s.account.currency} {fmtAmount(s.closingBalance)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Grand Total */}
            <div className="border-2 border-border rounded-lg p-4 bg-muted/30">
              <h3 className="font-bold text-base mb-3">Grand Summary — All Accounts</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Receipts</p>
                  <p className="font-bold text-green-700 text-lg">{fmtAmount(grandTotalReceipts)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Payments</p>
                  <p className="font-bold text-red-700 text-lg">{fmtAmount(grandTotalPayments)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Net Movement</p>
                  <p className={`font-bold text-lg ${grandTotalReceipts - grandTotalPayments >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {fmtAmount(grandTotalReceipts - grandTotalPayments)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
