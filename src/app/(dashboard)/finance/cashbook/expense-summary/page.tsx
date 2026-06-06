"use client";

import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

interface GroupedCategory {
  category: string;
  pvNumbers: (number | null)[];
  pvDisplay: string;
  items: {
    id: string;
    description: string;
    amount: number;
    pvNumber: number | null;
    paymentMethod: string;
    chequeRef: string | null;
  }[];
  total: number;
}

interface ExpenseSummary {
  date: string;
  companyId: string;
  grouped: GroupedCategory[];
  grandTotal: number;
}

function fmtAmount(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ExpenseSummaryPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
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
    fetch(`/api/finance/cashbook/expense-summary?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSummary(d.data ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date]);

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-page { padding: 24px; font-family: serif; }
          table { font-size: 12px; border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000; padding: 4px 8px; }
          .sig-section { margin-top: 48px; }
        }
      `}</style>

      <div className="space-y-6 print-page">
        {/* Controls — hidden on print */}
        <div className="no-print flex items-center justify-between flex-wrap gap-3">
          <PageHeader title="Expense Summary" description="Printable company expense summary by category (Document 1 format)" />
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline" className="mt-4" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold uppercase tracking-wide">SUMMARY</h1>
          <p className="text-base font-semibold mt-1 uppercase">{companyName}</p>
          <div className="flex justify-end mt-1">
            <p className="text-sm font-medium">DATE: {displayDate}</p>
          </div>
        </div>

        {loading ? (
          <LoadingState text="Loading expense summary..." />
        ) : !summary || summary.grouped.length === 0 ? (
          <EmptyState
            title="No entries"
            description="No cashbook entries found for the selected date."
          />
        ) : (
          <>
            {/* Summary Table */}
            <table className="w-full border-collapse border border-black text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-3 py-2 text-left font-bold w-12">S/N</th>
                  <th className="border border-black px-3 py-2 text-left font-bold">PARTICULAR</th>
                  <th className="border border-black px-3 py-2 text-left font-bold w-40">PV</th>
                  <th className="border border-black px-3 py-2 text-right font-bold w-36">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {summary.grouped.map((group, idx) => (
                  <tr key={group.category}>
                    <td className="border border-black px-3 py-2 text-center">{idx + 1}</td>
                    <td className="border border-black px-3 py-2 font-medium uppercase">
                      {group.category}
                    </td>
                    <td className="border border-black px-3 py-2 font-mono text-xs">
                      {group.pvDisplay
                        ? `PV: ${group.pvDisplay}`
                        : "—"}
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-medium">
                      {fmtAmount(group.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-gray-50">
                  <td colSpan={3} className="border border-black px-3 py-2 text-right uppercase">
                    TOTAL
                  </td>
                  <td className="border border-black px-3 py-2 text-right">
                    {fmtAmount(summary.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Signature Lines */}
            <div className="sig-section mt-12 grid grid-cols-2 gap-x-12 gap-y-10 pt-8">
              {["Prepared By", "Approved By", "Checked By", "Authorized By"].map((label) => (
                <div key={label}>
                  <p className="text-sm font-medium mb-6">{label}:</p>
                  <div className="border-b border-gray-400 w-full" style={{ borderBottomStyle: "dotted", borderBottomWidth: "2px" }} />
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
