"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";

// Lazy-load recharts pieces so the ~100kB library stays out of the initial bundle
const StockBarChart = dynamic(
  () => import("./OperationsCharts").then((m) => m.StockBarChart),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> }
);
const StatusPieChart = dynamic(
  () => import("./OperationsCharts").then((m) => m.StatusPieChart),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> }
);

export default function OperationsAnalyticsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/analytics/operations");
        const json = await res.json();
        if (res.ok) {
          setMetrics(json.data);
        } else {
          toast.error(json.message || "Failed to load metrics");
        }
      } catch {
        toast.error("Failed to load operational metrics");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <LoadingState text="Loading operational analytics..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Operational Analytics" description="Warehouse, transport, maintenance, and quality metrics" />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Stock by Warehouse</CardTitle></CardHeader>
          <CardContent>
            <StockBarChart data={metrics?.stockByWarehouse || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trip Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <StatusPieChart data={metrics?.tripStatusBreakdown || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Work Order Status</CardTitle></CardHeader>
          <CardContent>
            <StatusPieChart data={metrics?.maintenanceByStatus || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>QC Test Results</CardTitle></CardHeader>
          <CardContent>
            <StatusPieChart data={metrics?.qcResults || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
