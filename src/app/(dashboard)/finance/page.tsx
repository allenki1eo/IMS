"use client";

import { useEffect, useState } from "react";
import { Landmark, BookOpen, Wallet, Banknote, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import Link from "next/link";

interface FinanceStats {
  totalAccounts: number;
  totalBankBalance: number;
  pendingPayments: number;
  completedPayments: number;
  draftJournals: number;
  postedJournals: number;
}

export default function FinancePage() {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/finance/accounts?page=1&pageSize=1");
        const accounts = res.ok ? await res.json() : { meta: { total: 0 } };

        const res2 = await fetch("/api/finance/bank-accounts?page=1&pageSize=100");
        const banks = res2.ok ? await res2.json() : { data: [] };
        const totalBankBalance = banks.data?.reduce((sum: number, b: any) => sum + (b.currentBalance || 0), 0) || 0;

        const res3 = await fetch("/api/finance/payments?status=PENDING&page=1&pageSize=1");
        const pending = res3.ok ? await res3.json() : { meta: { total: 0 } };

        const res4 = await fetch("/api/finance/payments?status=COMPLETED&page=1&pageSize=1");
        const completed = res4.ok ? await res4.json() : { meta: { total: 0 } };

        const res5 = await fetch("/api/finance/journal-entries?status=DRAFT&page=1&pageSize=1");
        const drafts = res5.ok ? await res5.json() : { meta: { total: 0 } };

        const res6 = await fetch("/api/finance/journal-entries?status=POSTED&page=1&pageSize=1");
        const posted = res6.ok ? await res6.json() : { meta: { total: 0 } };

        setStats({
          totalAccounts: accounts.meta?.total || 0,
          totalBankBalance,
          pendingPayments: pending.meta?.total || 0,
          completedPayments: completed.meta?.total || 0,
          draftJournals: drafts.meta?.total || 0,
          postedJournals: posted.meta?.total || 0,
        });
      } catch {
        setStats({
          totalAccounts: 0,
          totalBankBalance: 0,
          pendingPayments: 0,
          completedPayments: 0,
          draftJournals: 0,
          postedJournals: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <LoadingState text="Loading finance overview..." />;

  const cards = [
    { label: "Chart of Accounts", value: stats?.totalAccounts || 0, icon: BookOpen, href: "/finance/accounts" },
    { label: "Bank Balance", value: `$${(stats?.totalBankBalance || 0).toLocaleString()}`, icon: Landmark, href: "/finance/bank-accounts" },
    { label: "Pending Payments", value: stats?.pendingPayments || 0, icon: Wallet, href: "/finance/payments?status=PENDING" },
    { label: "Completed Payments", value: stats?.completedPayments || 0, icon: Banknote, href: "/finance/payments?status=COMPLETED" },
    { label: "Draft Journals", value: stats?.draftJournals || 0, icon: FileText, href: "/finance/journal-entries?status=DRAFT" },
    { label: "Posted Journals", value: stats?.postedJournals || 0, icon: FileText, href: "/finance/journal-entries?status=POSTED" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Finance Operations" description="Chart of accounts, journal entries, bank accounts, payments, and financial reports" />

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
