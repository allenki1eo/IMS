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
  paymentMethod: string;
  chequeRef: string | null;
  pvNumber: number | null;
  category: string;
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

function chequeOrRef(entry: CashbookEntryRow): string {
  if (entry.chequeRef) return entry.chequeRef;
  if (entry.paymentMethod === "CHEQUE") return "Cheque";
  if (entry.paymentMethod === "ONLINE") return "Online";
  if (entry.paymentMethod === "BANK_TRANSFER") return "Bank";
  return entry.paymentMethod;
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
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const grandTotalReceipts = summaries.reduce((s, x) => s + x.totalReceipts, 0);
  const grandTotalPayments = summaries.reduce((s, x) => s + x.totalPayments, 0);
  const grandOpeningBalance = summaries.reduce((s, x) => s + x.openingBalance, 0);
  const grossClosingBalance = grandOpeningBalance + grandTotalReceipts - grandTotalPayments;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-container { padding: 20px; }
          table { font-size: 11px; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 3px 6px; }
          .sig-section { margin-top: 40px; }
        }
      `}</style>

      <div className="space-y-6 print-container">
        {/* Controls — hidden on print */}
        <div className="no-print flex items-center justify-between flex-wrap gap-3">
          <PageHeader title="Daily Summary" description="Print-ready daily cashbook summary matching consolidated multi-account format" />
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

        {/* Document Title */}
        <div className="text-center mb-2">
          <h1 className="text-xl font-bold uppercase tracking-wider">SUMMARY</h1>
          <h2 className="text-base font-semibold mt-1 uppercase">REQUEST FOR: {displayDate}</h2>
        </div>

        {loading ? (
          <LoadingState text="Loading daily summary..." />
        ) : summaries.length === 0 ? (
          <EmptyState title="No bank accounts" description="No active bank accounts found." />
        ) : (
          <>
            {/* Main consolidated table */}
            <table className="w-full border-collapse border border-black text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-3 py-2 text-left font-bold">DESCRIPTION</th>
                  <th className="border border-black px-3 py-2 text-left font-bold w-32">CHEQUE NO. / REF</th>
                  <th className="border border-black px-3 py-2 text-right font-bold w-36">PETTY CASH</th>
                  <th className="border border-black px-3 py-2 text-right font-bold w-36">EXPENSES</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance */}
                <tr className="font-semibold bg-gray-50">
                  <td className="border border-black px-3 py-2" colSpan={2}>OPENING BALANCE</td>
                  <td className="border border-black px-3 py-2 text-right">{fmtAmount(grandOpeningBalance)}</td>
                  <td className="border border-black px-3 py-2" />
                </tr>

                {/* Per-account (company) sections */}
                {summaries.map((s) => (
                  <>
                    {/* Account section header */}
                    <tr key={`hdr-${s.account.id}`} className="bg-blue-50">
                      <td
                        colSpan={4}
                        className="border border-black px-3 py-1.5 font-bold uppercase text-xs tracking-wide"
                      >
                        {s.account.name}{s.account.bankName ? ` — ${s.account.bankName}` : ""}
                      </td>
                    </tr>

                    {/* Payment rows (outgoing) */}
                    {s.payments.length > 0 ? (
                      s.payments.map((entry) => (
                        <tr key={entry.id}>
                          <td className="border border-black px-3 py-1">
                            {entry.description}
                            {entry.counterparty ? ` — ${entry.counterparty}` : ""}
                          </td>
                          <td className="border border-black px-3 py-1 font-mono text-xs">
                            {chequeOrRef(entry)}
                          </td>
                          <td className="border border-black px-3 py-1" />
                          <td className="border border-black px-3 py-1 text-right">
                            {fmtAmount(entry.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr key={`empty-pmt-${s.account.id}`}>
                        <td colSpan={4} className="border border-black px-3 py-1 text-muted-foreground italic text-xs">
                          No payments
                        </td>
                      </tr>
                    )}

                    {/* Account subtotal */}
                    <tr key={`sub-${s.account.id}`} className="font-semibold bg-gray-50">
                      <td colSpan={2} className="border border-black px-3 py-1.5 text-right uppercase text-xs">
                        TOTAL {s.account.name.toUpperCase()}:
                      </td>
                      <td className="border border-black px-3 py-1.5" />
                      <td className="border border-black px-3 py-1.5 text-right">
                        {fmtAmount(s.totalPayments)}
                      </td>
                    </tr>
                  </>
                ))}

                {/* Cash Received section */}
                <tr className="bg-green-50 font-semibold">
                  <td colSpan={4} className="border border-black px-3 py-1.5 font-bold uppercase text-xs tracking-wide">
                    CASH RECEIVED
                  </td>
                </tr>
                {summaries.flatMap((s) => s.receipts).length > 0 ? (
                  summaries.flatMap((s) =>
                    s.receipts.map((entry) => (
                      <tr key={entry.id}>
                        <td className="border border-black px-3 py-1">
                          {entry.description}
                          {entry.counterparty ? ` — ${entry.counterparty}` : ""}
                        </td>
                        <td className="border border-black px-3 py-1 font-mono text-xs">
                          {chequeOrRef(entry)}
                        </td>
                        <td className="border border-black px-3 py-1 text-right text-green-700">
                          {fmtAmount(entry.amount)}
                        </td>
                        <td className="border border-black px-3 py-1" />
                      </tr>
                    ))
                  )
                ) : (
                  <tr>
                    <td colSpan={4} className="border border-black px-3 py-1 text-muted-foreground italic text-xs">
                      No receipts
                    </td>
                  </tr>
                )}

                {/* Totals rows */}
                <tr className="font-bold bg-gray-100">
                  <td colSpan={2} className="border border-black px-3 py-2 text-right uppercase">
                    TOTAL PETTY CASH / CASH RECEIVED:
                  </td>
                  <td className="border border-black px-3 py-2 text-right">
                    {fmtAmount(grandTotalReceipts)}
                  </td>
                  <td className="border border-black px-3 py-2" />
                </tr>
                <tr className="font-bold bg-gray-100">
                  <td colSpan={2} className="border border-black px-3 py-2 text-right uppercase">
                    TOTAL EXPENSES:
                  </td>
                  <td className="border border-black px-3 py-2" />
                  <td className="border border-black px-3 py-2 text-right">
                    {fmtAmount(grandTotalPayments)}
                  </td>
                </tr>
                <tr className="font-bold bg-yellow-50">
                  <td colSpan={2} className="border border-black px-3 py-2 text-right uppercase">
                    GROSS CLOSING BALANCE:
                  </td>
                  <td className="border border-black px-3 py-2 text-right" colSpan={2}>
                    {fmtAmount(grossClosingBalance)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Signature Lines */}
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
