"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";
import {
  Users, Warehouse, Truck, Fuel, Wrench, ShoppingCart,
  Factory, FlaskConical, SendHorizonal, Landmark,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";

// Lazy-load recharts pieces so the ~100kB library stays out of the initial bundle
const MonthlyActivityChart = dynamic(
  () => import("./AnalyticsCharts").then((m) => m.MonthlyActivityChart),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> }
);
const OperationalVolumeChart = dynamic(
  () => import("./AnalyticsCharts").then((m) => m.OperationalVolumeChart),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> }
);

export default function AnalyticsPage() {
  const currency = useCurrency();
  const [kpis, setKpis] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [kpiRes, trendRes] = await Promise.all([
        fetch("/api/analytics/kpis"),
        fetch("/api/analytics/trends?months=6"),
      ]);
      const kpiJson = await kpiRes.json().catch(() => ({}));
      const trendJson = await trendRes.json().catch(() => ({}));

      if (!kpiRes.ok) {
        setKpis(null);
        setTrends([]);
        const msg = kpiJson.message || "Failed to load analytics KPIs";
        setLoadError(msg);
        toast.error(msg);
        return;
      }

      setKpis(kpiJson.data);
      if (trendRes.ok) {
        setTrends(trendJson.data ?? []);
      } else {
        setTrends([]);
        toast.error(trendJson.message || "Failed to load analytics trends");
      }
    } catch {
      setKpis(null);
      setTrends([]);
      const msg = "Failed to load analytics";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, retryCount]);

  if (loading) return <LoadingState text="Loading analytics..." />;
  if (loadError || !kpis) {
    return (
      <ErrorState
        title="Could not load management analytics"
        description="KPI cards were not loaded. This is not the same as having zero activity."
        error={loadError}
        onRetry={() => setRetryCount((c) => c + 1)}
      />
    );
  }

  const kpiCards = [
    { label: "Users", value: kpis.totalUsers ?? 0, icon: Users, href: "/admin/users" },
    { label: "Items", value: kpis.totalItems ?? 0, icon: Warehouse, href: "/warehouse/items" },
    { label: "Vehicles", value: kpis.totalVehicles ?? 0, icon: Truck, href: "/transport/vehicles" },
    { label: "Fuel Tanks", value: kpis.totalFuelTanks ?? 0, icon: Fuel, href: "/fuel/tanks" },
    { label: "Open Work Orders", value: kpis.openWorkOrders ?? 0, icon: Wrench, href: "/maintenance/work-orders" },
    { label: "Suppliers", value: kpis.totalSuppliers ?? 0, icon: ShoppingCart, href: "/procurement/suppliers" },
    { label: "Active Batches", value: kpis.activeBatches ?? 0, icon: Factory, href: "/production/batches" },
    { label: "Open NCRs", value: kpis.openNCRs ?? 0, icon: FlaskConical, href: "/qc/ncr" },
    { label: "Pending Dispatch", value: kpis.pendingDispatchOrders ?? 0, icon: SendHorizonal, href: "/dispatch/orders" },
    { label: "Bank Balance", value: `${currency} ${(kpis.totalBankBalance ?? 0).toLocaleString()}`, icon: Landmark, href: "/finance/bank-accounts" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Management Analytics" description="Executive dashboard with KPIs and trends across all modules" />

      <div className="flex flex-wrap gap-2">
        <Link href="/analytics/operations"><Button variant="outline">Operational Analytics</Button></Link>
        <Link href="/analytics/financial"><Button variant="outline">Financial Analytics</Button></Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
        {kpiCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">{card.label}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Monthly Activity Trends</CardTitle></CardHeader>
          <CardContent>
            <MonthlyActivityChart data={trends} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Operational Volume</CardTitle></CardHeader>
          <CardContent>
            <OperationalVolumeChart data={trends} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
