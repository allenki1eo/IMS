"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileBarChart, TrendingUp, Scale } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/shared/LoadingState";
import { ReportDocument } from "@/components/reports/paper/ReportDocument";
import {
  formatPaperDate, formatPeriod, table,
  type ReportBlock, type ReportMeta,
} from "@/components/reports/paper/types";
import { useCurrency } from "@/hooks/useCurrency";

type ReportType = "trial" | "income" | "balance";

function today() {
  return new Date().toISOString().split("T")[0];
}

function firstOfYear() {
  return `${new Date().getFullYear()}-01-01`;
}

interface Built {
  meta: Omit<ReportMeta, "currency">;
  blocks: ReportBlock[];
}

function buildTrialBalance(data: any): Built {
  return {
    meta: { title: "Trial Balance", code: "TB", period: `As at ${formatPaperDate(new Date())}`, subtitle: "Current balances of all active accounts" },
    blocks: [
      {
        kind: "note",
        title: "Status",
        tone: data.isBalanced ? "success" : "destructive",
        text: data.isBalanced
          ? "The trial balance is in balance: total debits equal total credits."
          : `The trial balance is OUT OF BALANCE by ${Math.abs(data.totalDebit - data.totalCredit).toLocaleString()}. Investigate before relying on these figures.`,
      },
      table<any>({
        title: "Account Balances",
        rows: data.data,
        emptyText: "No account activity.",
        columns: [
          { header: "Code", value: (r) => r.code, format: "code", width: "12%" },
          { header: "Account", value: (r) => r.name },
          { header: "Type", value: (r) => r.accountType },
          { header: "Debit", value: (r) => r.totalDebit || null, format: "money", total: true },
          { header: "Credit", value: (r) => r.totalCredit || null, format: "money", total: true },
          { header: "Net balance", value: (r) => r.netBalance, format: "money" },
        ],
      }),
    ],
  };
}

function buildIncomeStatement(data: any): Built {
  const lines = (items: any[]) => items.map((r) => ({ code: r.code, label: r.name, amount: r.amount }));
  return {
    meta: { title: "Income Statement", code: "PL", period: formatPeriod(data.fromDate, data.toDate), subtitle: "Statement of profit or loss" },
    blocks: [{
      kind: "statement",
      title: "Profit and Loss",
      groups: [
        { heading: "Revenue", lines: lines(data.revenue), totalLabel: "Total revenue", total: data.totalRevenue, emptyText: "No revenue recorded in this period." },
        { heading: "Expenses", lines: lines(data.expenses), totalLabel: "Total expenses", total: data.totalExpenses, emptyText: "No expenses recorded in this period." },
      ],
      result: {
        label: data.netIncome >= 0 ? "Net profit for the period" : "Net loss for the period",
        amount: Math.abs(data.netIncome),
        tone: data.netIncome >= 0 ? "positive" : "negative",
      },
    }],
  };
}

function buildBalanceSheet(data: any): Built {
  const lines = (items: any[]) => items.map((r) => ({ code: r.code, label: r.name, amount: r.balance }));
  const blocks: ReportBlock[] = [];
  if (!data.isBalanced) {
    blocks.push({
      kind: "note",
      title: "Status",
      tone: "destructive",
      text: "Assets do not equal liabilities plus equity. Review unposted entries before relying on this statement.",
    });
  }
  blocks.push({
    kind: "statement",
    title: "Statement of Financial Position",
    groups: [
      { heading: "Assets", lines: lines(data.assets), totalLabel: "Total assets", total: data.totalAssets },
      { heading: "Liabilities", lines: lines(data.liabilities), totalLabel: "Total liabilities", total: data.totalLiabilities },
      { heading: "Equity", lines: lines(data.equity), totalLabel: "Total equity", total: data.totalEquity },
    ],
    result: { label: "Total liabilities and equity", amount: data.totalLiabilitiesAndEquity },
  });
  return {
    meta: { title: "Balance Sheet", code: "BS", period: `As at ${formatPaperDate(data.asOfDate)}` },
    blocks,
  };
}

export default function FinancialReportsPage() {
  const currency = useCurrency();
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
    setData(null); // remount the document so it is stamped for this run
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
      <div className="no-print space-y-6">
      <PageHeader title="Financial Reports" description="Trial balance, income statement, and balance sheet — formatted for print and PDF" />

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
      </div>

      {loading && <LoadingState text="Generating report…" />}

      {data && !loading && (() => {
        const built =
          reportType === "trial" ? buildTrialBalance(data)
          : reportType === "income" ? buildIncomeStatement(data)
          : buildBalanceSheet(data);
        return <ReportDocument meta={{ ...built.meta, currency }} blocks={built.blocks} />;
      })()}
    </div>
  );
}
