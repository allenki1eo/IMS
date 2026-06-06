"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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

function typeBadge(type: string) {
  if (type === "RECEIPT") return <Badge className="bg-green-100 text-green-700 border-green-300">Receipt</Badge>;
  if (type === "PAYMENT") return <Badge className="bg-red-100 text-red-700 border-red-300">Payment</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-300">Transfer</Badge>;
}

/* ─── Entry Detail Sheet ─────────────────────────────────────────────────────── */

function EntryDetailSheet({
  entry,
  accountName,
  onClose,
}: {
  entry: CashbookEntryRow | null;
  accountName: string;
  onClose: () => void;
}) {
  if (!entry) return null;

  const entryDate = new Date(entry.date + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Sheet open={!!entry} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Entry Detail</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* PV Number */}
          {entry.pvNumber && (
            <div className="text-center py-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">PV Number</p>
              <p className="text-3xl font-bold">#{entry.pvNumber}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Date</p>
              <p className="font-medium">{entryDate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Type</p>
              {typeBadge(entry.type)}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Category</p>
            <p className="text-sm font-medium">{entry.category}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm font-medium">{entry.description}</p>
          </div>

          {entry.counterparty && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {entry.type === "RECEIPT" ? "Received From" : entry.type === "PAYMENT" ? "Paid To" : "Initiated By"}
              </p>
              <p className="text-sm font-medium">{entry.counterparty}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
              <p className="font-medium">{entry.paymentMethod}</p>
            </div>
            {entry.chequeRef && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Cheque / Ref</p>
                <p className="font-medium font-mono">{entry.chequeRef}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Bank Account</p>
            <p className="text-sm font-medium">{accountName}</p>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-1">Amount</p>
            <p className={`text-2xl font-bold ${entry.type === "RECEIPT" ? "text-green-700" : entry.type === "PAYMENT" ? "text-red-700" : "text-amber-700"}`}>
              TZS {fmtAmount(entry.amount)}
            </p>
          </div>

          <Button variant="outline" className="w-full mt-4" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Inner page (uses searchParams) ────────────────────────────────────────── */

function CashbookSummaryInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlDate = searchParams.get("date");
  const urlCompanyId = searchParams.get("companyId");

  const [date, setDate] = useState(() => urlDate ?? new Date().toISOString().slice(0, 10));
  const [summaries, setSummaries] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("Company");
  const [selectedEntry, setSelectedEntry] = useState<CashbookEntryRow | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState("");

  // Fetch company name for drill-down
  useEffect(() => {
    if (urlCompanyId) {
      fetch(`/api/company?companyId=${urlCompanyId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.data?.name) setCompanyName(d.data.name);
        })
        .catch(() => {});
    } else {
      fetch("/api/company")
        .then((r) => r.json())
        .then((d) => {
          if (d.data?.name) setCompanyName(d.data.name);
        })
        .catch(() => {});
    }
  }, [urlCompanyId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ date });
    if (urlCompanyId) params.set("companyId", urlCompanyId);
    fetch(`/api/finance/cashbook/summary?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSummaries(d.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date, urlCompanyId]);

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const grandTotalReceipts = summaries.reduce((s, x) => s + x.totalReceipts, 0);
  const grandTotalPayments = summaries.reduce((s, x) => s + x.totalPayments, 0);
  const grandOpeningBalance = summaries.reduce((s, x) => s + x.openingBalance, 0);
  const grossClosingBalance = grandOpeningBalance + grandTotalReceipts - grandTotalPayments;

  const handleEntryClick = (entry: CashbookEntryRow, accountName: string) => {
    setSelectedEntry(entry);
    setSelectedAccountName(accountName);
  };

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
        {/* Controls */}
        <div className="no-print flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {urlCompanyId && (
              <Link href="/finance/cashbook/director">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back to Director View
                </Button>
              </Link>
            )}
            <PageHeader
              title={urlCompanyId ? `Daily Summary — ${companyName}` : "Daily Summary"}
              description="Print-ready daily cashbook summary"
            />
          </div>
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
          {urlCompanyId && <p className="text-base font-semibold text-muted-foreground">{companyName}</p>}
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

                {/* Per-account sections */}
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
                        <tr
                          key={entry.id}
                          className="cursor-pointer hover:bg-yellow-50 dark:hover:bg-zinc-700/50 no-print-hover"
                          onClick={() => handleEntryClick(entry, s.account.name)}
                        >
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
                      <tr
                        key={entry.id}
                        className="cursor-pointer hover:bg-yellow-50 dark:hover:bg-zinc-700/50"
                        onClick={() => handleEntryClick(entry, s.account.name)}
                      >
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

      {/* Entry Detail Sheet */}
      <EntryDetailSheet
        entry={selectedEntry}
        accountName={selectedAccountName}
        onClose={() => setSelectedEntry(null)}
      />
    </>
  );
}

/* ─── Exported Page (wraps in Suspense for useSearchParams) ──────────────────── */

export default function CashbookSummaryPage() {
  return (
    <Suspense fallback={<LoadingState text="Loading..." />}>
      <CashbookSummaryInner />
    </Suspense>
  );
}
