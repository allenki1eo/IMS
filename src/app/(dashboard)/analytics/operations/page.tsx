"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/analytics/operations");
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setMetrics(json.data);
      } else {
        setMetrics(null);
        const msg = json.message || "Failed to load metrics";
        setLoadError(msg);
        toast.error(msg);
      }
    } catch {
      setMetrics(null);
      const msg = "Failed to load operational metrics";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, retryCount]);

  if (loading) return <LoadingState text="Loading operational analytics..." />;
  if (loadError || !metrics) {
    return (
      <ErrorState
        title="Could not load operational analytics"
        description="Charts were not loaded. Empty charts would look like no stock, trips, or QC activity."
        error={loadError}
        onRetry={() => setRetryCount((c) => c + 1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Operational Analytics" description="Warehouse, transport, maintenance, and quality metrics" />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Stock by Warehouse</CardTitle></CardHeader>
          <CardContent>
            <StockBarChart data={metrics.stockByWarehouse || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trip Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <StatusPieChart data={metrics.tripStatusBreakdown || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Work Order Status</CardTitle></CardHeader>
          <CardContent>
            <StatusPieChart data={metrics.maintenanceByStatus || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>QC Test Results</CardTitle></CardHeader>
          <CardContent>
            <StatusPieChart data={metrics.qcResults || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
