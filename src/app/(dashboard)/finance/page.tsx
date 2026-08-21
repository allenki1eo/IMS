"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Landmark, BookOpen, Wallet, Banknote, FileText,
  TrendingUp, TrendingDown, AlertTriangle, ArrowRight,
} from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";
import Link from "next/link";

// Lazy-load recharts pieces so the ~100kB library stays out of the initial bundle
const FinanceTrendChart = dynamic(
  () => import("./FinanceCharts").then((m) => m.FinanceTrendChart),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> }
);
const BankBalancePie = dynamic(
  () => import("./FinanceCharts").then((m) => m.BankBalancePie),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> }
);

interface BankAccount {
  id: string;
  name: string;
  currentBalance: number;
  accountType: string;
}

interface TrendPoint {
  month: string;
  receipts: number;
  payments: number;
}

interface Stats {
  totalAccounts: number;
  totalBankBalance: number;
  pendingPayments: number;
  completedPayments: number;
  draftJournals: number;
  postedJournals: number;
  bankAccounts: BankAccount[];
  monthlyTrend: TrendPoint[];
}

const EMPTY_STATS: Stats = {
  totalAccounts: 0, totalBankBalance: 0,
  pendingPayments: 0, completedPayments: 0,
  draftJournals: 0, postedJournals: 0,
  bankAccounts: [], monthlyTrend: [],
};

function fmt(val: number, currency: string) {
  if (val >= 1_000_000) return `${currency} ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${currency} ${(val / 1_000).toFixed(0)}K`;
  return `${currency} ${val.toLocaleString()}`;
}

export default function FinancePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const currency = useCurrency();

  useEffect(() => {
    async function fetchStats() {
      try {
        // Single aggregated request (replaces 7 separate list-endpoint calls)
        const res = await fetch("/api/finance/overview");
        const json = res.ok ? await res.json() : null;
        setStats(json?.data ? { ...EMPTY_STATS, ...json.data } : EMPTY_STATS);
      } catch {
        setStats(EMPTY_STATS);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <LoadingState text="Loading finance overview..." />;

  const trendData = stats?.monthlyTrend ?? [];
  const thisMonth = trendData[trendData.length - 1] ?? { receipts: 0, payments: 0 };
  const netMovement = thisMonth.receipts - thisMonth.payments;
  const netPositive = netMovement >= 0;

  const bankPieData = (stats?.bankAccounts ?? [])
    .filter((b) => b.currentBalance > 0)
    .map((b) => ({ name: b.name, value: b.currentBalance }));

  const kpis = [
    {
      label: "Total Bank Balance",
      value: fmt(stats?.totalBankBalance || 0, currency),
      icon: Landmark,
      href: "/finance/bank-accounts",
      sub: `${stats?.bankAccounts.length ?? 0} active accounts`,
      accent: "text-blue-600",
    },
    {
      label: "Pending Payments",
      value: stats?.pendingPayments || 0,
      icon: stats?.pendingPayments ? AlertTriangle : Wallet,
      href: "/finance/payments?status=PENDING",
      sub: "Awaiting processing",
      accent: stats?.pendingPayments ? "text-amber-600" : "text-muted-foreground",
    },
    {
      label: "Net Movement (MTD)",
      value: `${netPositive ? "+" : ""}${fmt(netMovement, currency)}`,
      icon: netPositive ? TrendingUp : TrendingDown,
      href: "/finance/cashbook",
      sub: `${fmt(thisMonth.receipts, currency)} in · ${fmt(thisMonth.payments, currency)} out`,
      accent: netPositive ? "text-green-600" : "text-red-600",
    },
    {
      label: "Chart of Accounts",
      value: stats?.totalAccounts || 0,
      icon: BookOpen,
      href: "/finance/accounts",
      sub: `${stats?.draftJournals || 0} draft journals pending`,
      accent: "text-muted-foreground",
    },
    {
      label: "Posted Journals",
      value: stats?.postedJournals || 0,
      icon: FileText,
      href: "/finance/journal-entries?status=POSTED",
      sub: "Finalised entries",
      accent: "text-green-600",
    },
    {
      label: "Completed Payments",
      value: stats?.completedPayments || 0,
      icon: Banknote,
      href: "/finance/payments?status=COMPLETED",
      sub: "Settled transactions",
      accent: "text-muted-foreground",
    },
  ];

  const quickLinks = [
    { label: "Cashbook", href: "/finance/cashbook" },
    { label: "Outstanding", href: "/finance/outstanding" },
    { label: "Reports", href: "/finance/reports" },
    { label: "Day Book", href: "/finance/day-book" },
    { label: "Director View", href: "/finance/cashbook/director" },
    { label: "Exchange Rates", href: "/finance/exchange-rates" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Operations"
        description="Chart of accounts, journal entries, bank accounts, payments, and financial reports"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{k.label}</CardTitle>
                <k.icon className={`h-4 w-4 ${k.accent}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-semibold tracking-tight tabular-nums ${k.accent}`}>{k.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-5">
        {/* Receipts vs Payments trend */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Receipts vs Payments — Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.every((d) => d.receipts === 0 && d.payments === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">No cashbook data yet</p>
            ) : (
              <FinanceTrendChart data={trendData} currency={currency} />
            )}
          </CardContent>
        </Card>

        {/* Bank balance breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cash by Bank Account</CardTitle>
          </CardHeader>
          <CardContent>
            {bankPieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No bank accounts</p>
            ) : (
              <BankBalancePie data={bankPieData} currency={currency} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
              >
                {l.label}
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
