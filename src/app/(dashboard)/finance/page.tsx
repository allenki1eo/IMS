"use client";

import { useEffect, useState } from "react";
import {
  Landmark, BookOpen, Wallet, Banknote, FileText,
  TrendingUp, TrendingDown, AlertTriangle, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import Link from "next/link";

interface BankAccount {
  id: string;
  name: string;
  currentBalance: number;
  accountType: string;
}

interface CashbookEntry {
  type: string;
  amount: number;
  entryDate: string;
}

interface Stats {
  totalAccounts: number;
  totalBankBalance: number;
  pendingPayments: number;
  completedPayments: number;
  draftJournals: number;
  postedJournals: number;
  bankAccounts: BankAccount[];
  recentCashbook: CashbookEntry[];
}

const CHART_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2"];

function fmt(val: number, currency: string) {
  if (val >= 1_000_000) return `${currency} ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${currency} ${(val / 1_000).toFixed(0)}K`;
  return `${currency} ${val.toLocaleString()}`;
}

// Build last-6-months receipt vs payment trend from cashbook entries
function buildTrend(entries: CashbookEntry[]) {
  const months: Record<string, { month: string; receipts: number; payments: number }> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short" });
    months[key] = { month: label, receipts: 0, payments: 0 };
  }
  for (const e of entries) {
    const key = e.entryDate?.slice(0, 7);
    if (!months[key]) continue;
    if (e.type === "RECEIPT") months[key].receipts += e.amount;
    else if (e.type === "PAYMENT") months[key].payments += e.amount;
  }
  return Object.values(months);
}

export default function FinancePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const currency = useCurrency();

  useEffect(() => {
    async function fetchStats() {
      try {
        const [accountsRes, banksRes, pendingRes, completedRes, draftsRes, postedRes, cashbookRes] =
          await Promise.all([
            fetch("/api/finance/accounts?page=1&pageSize=1"),
            fetch("/api/finance/bank-accounts?page=1&pageSize=100"),
            fetch("/api/finance/payments?status=PENDING&page=1&pageSize=1"),
            fetch("/api/finance/payments?status=COMPLETED&page=1&pageSize=1"),
            fetch("/api/finance/journal-entries?status=DRAFT&page=1&pageSize=1"),
            fetch("/api/finance/journal-entries?status=POSTED&page=1&pageSize=1"),
            fetch("/api/finance/cashbook?page=1&pageSize=500"),
          ]);

        const accounts = accountsRes.ok ? await accountsRes.json() : { meta: { total: 0 } };
        const banks = banksRes.ok ? await banksRes.json() : { data: [] };
        const pending = pendingRes.ok ? await pendingRes.json() : { meta: { total: 0 } };
        const completed = completedRes.ok ? await completedRes.json() : { meta: { total: 0 } };
        const drafts = draftsRes.ok ? await draftsRes.json() : { meta: { total: 0 } };
        const posted = postedRes.ok ? await postedRes.json() : { meta: { total: 0 } };
        const cashbook = cashbookRes.ok ? await cashbookRes.json() : { data: [] };

        const bankAccounts: BankAccount[] = banks.data ?? [];
        const totalBankBalance = bankAccounts.reduce((s, b) => s + (b.currentBalance || 0), 0);

        setStats({
          totalAccounts: accounts.meta?.total || 0,
          totalBankBalance,
          pendingPayments: pending.meta?.total || 0,
          completedPayments: completed.meta?.total || 0,
          draftJournals: drafts.meta?.total || 0,
          postedJournals: posted.meta?.total || 0,
          bankAccounts,
          recentCashbook: cashbook.data ?? [],
        });
      } catch {
        setStats({
          totalAccounts: 0, totalBankBalance: 0,
          pendingPayments: 0, completedPayments: 0,
          draftJournals: 0, postedJournals: 0,
          bankAccounts: [], recentCashbook: [],
        });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <LoadingState text="Loading finance overview..." />;

  const trendData = buildTrend(stats?.recentCashbook ?? []);
  const lastMonth = trendData[trendData.length - 2] ?? { receipts: 0, payments: 0 };
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
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v, "")} width={60} />
                  <Tooltip formatter={(v: number) => fmt(v, currency)} />
                  <Legend />
                  <Bar dataKey="receipts" name="Receipts" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="payments" name="Payments" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={bankPieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                  >
                    {bankPieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v, currency)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
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
