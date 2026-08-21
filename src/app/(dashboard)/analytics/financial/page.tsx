"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
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
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState("6");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/financial?months=${months}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data ?? []);
      } else {
        toast.error(json.message || "Failed to load financial trends");
      }
    } catch {
      toast.error("Failed to load financial trends");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Analytics" description="Revenue, expenses, payments, and receipts over time" />

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <Label>Months</Label>
          <Input type="number" min={3} max={24} value={months} onChange={(e) => setMonths(e.target.value)} className="w-24" />
        </div>
        <Button onClick={fetchData} disabled={loading}>{loading ? "Loading..." : "Update"}</Button>
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
