"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Lazy-load recharts pieces so the ~100kB library stays out of the initial bundle
const RevenueExpensesChart = dynamic(
  () => import("./FinancialCharts").then((m) => m.RevenueExpensesChart),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> }
);
const NetPositionChart = dynamic(
  () => import("./FinancialCharts").then((m) => m.NetPositionChart),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> }
);

export default function FinancialAnalyticsPage() {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [months, setMonths] = useState("6");
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/analytics/financial?months=${months}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setData(json.data ?? []);
      } else {
        setData(null);
        const msg = json.message || "Failed to load financial trends";
        setLoadError(msg);
        toast.error(msg);
      }
    } catch {
      setData(null);
      const msg = "Failed to load financial trends";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    fetchData();
  }, [fetchData, retryCount]);

  if (loading && data === null && !loadError) {
    return <LoadingState text="Loading financial analytics..." />;
  }

  if (loadError || data === null) {
    return (
      <div className="space-y-6">
        <PageHeader title="Financial Analytics" description="Revenue, expenses, payments, and receipts over time" />
        <ErrorState
          title="Could not load financial analytics"
          description="Trends were not loaded. Flat zero charts would look like no financial activity."
          error={loadError}
          onRetry={() => setRetryCount((c) => c + 1)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Analytics" description="Revenue, expenses, payments, and receipts over time" />

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <Label>Months</Label>
          <Input type="number" min={3} max={24} value={months} onChange={(e) => setMonths(e.target.value)} className="w-24" />
        </div>
        <Button onClick={() => setRetryCount((c) => c + 1)} disabled={loading}>{loading ? "Loading..." : "Update"}</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <RevenueExpensesChart data={data} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Net Position</CardTitle></CardHeader>
          <CardContent>
            <NetPositionChart data={data} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
