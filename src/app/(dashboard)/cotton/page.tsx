"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Package, Layers, FileText, TrendingUp, ClipboardList,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface StatsData {
  activeSeason: { id: string; name: string } | null;
  totalBales: number;
  totalWeightKg: number;
  lots: { open: number; assigned: number; invoiced: number; delivered: number };
  contracts: { count: number; totalValueUsd: number };
  recentContracts: Array<{
    id: string;
    contractNumber: string;
    status: string;
    totalAmount: number;
    totalWeight: number;
    contractDate: string;
    buyer: { id: string; name: string };
    _count: { lines: number };
  }>;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  href?: string;
}) {
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export default function CottonOverviewPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cotton/overview")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data);
        else toast.error("Failed to load cotton overview");
      })
      .catch(() => toast.error("Failed to load cotton overview"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Cotton Trading"
        description={
          stats?.activeSeason
            ? `Active season: ${stats.activeSeason.name}`
            : "No active season — create one to get started"
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/cotton/lots">View Lots</Link>
            </Button>
            <Button asChild>
              <Link href="/cotton/contracts/new">New Contract</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Total Bales"
          value={stats?.totalBales ?? 0}
          subtitle={stats ? `${stats.totalWeightKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg total` : undefined}
          icon={Package}
          href="/cotton/bales"
        />
        <StatCard
          title="Open Lots"
          value={stats?.lots.open ?? 0}
          subtitle={`${stats?.lots.assigned ?? 0} assigned, ${stats?.lots.invoiced ?? 0} invoiced`}
          icon={Layers}
          href="/cotton/lots"
        />
        <StatCard
          title="Contracts"
          value={stats?.contracts.count ?? 0}
          subtitle="Active contracts"
          icon={ClipboardList}
          href="/cotton/contracts"
        />
        <StatCard
          title="Total Contract Value"
          value={`$${(stats?.contracts.totalValueUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtitle="USD"
          icon={TrendingUp}
          href="/cotton/invoices"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Recent Contracts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!stats?.recentContracts?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No contracts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Contract #</th>
                    <th className="text-left py-2 pr-4 font-medium">Buyer</th>
                    <th className="text-left py-2 pr-4 font-medium">Lots</th>
                    <th className="text-right py-2 pr-4 font-medium">Weight (kg)</th>
                    <th className="text-right py-2 pr-4 font-medium">Amount (USD)</th>
                    <th className="text-left py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentContracts.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-4">
                        <Link href={`/cotton/contracts/${c.id}`} className="font-medium hover:underline text-primary">
                          {c.contractNumber}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{c.buyer.name}</td>
                      <td className="py-2 pr-4">{c._count.lines}</td>
                      <td className="py-2 pr-4 text-right">{c.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                      <td className="py-2 pr-4 text-right">${c.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="py-2"><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
