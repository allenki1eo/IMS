"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Fuel, TrendingDown, Droplets, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";

interface TankSummary {
  id: string;
  name: string;
  fuelType: string;
  currentLevel: number;
  capacity: number;
  minLevel: number;
  status: string;
}

interface RecentIssue {
  id: string;
  reference: string;
  vehicle?: { plateNumber: string } | null;
  driver?: { firstName: string; lastName: string } | null;
  quantity: number;
  issuedAt: string;
}

interface Stats {
  totalTanks: number;
  lowTanks: number;
  totalIssuedThisMonth: number;
  totalCostThisMonth: number;
}

function fillColor(pct: number) {
  if (pct > 50) return "#22c55e";
  if (pct > 25) return "#f59e0b";
  return "#ef4444";
}

function tankStatusLabel(tank: TankSummary): { label: string; color: string } {
  const pct = tank.capacity > 0 ? (tank.currentLevel / tank.capacity) * 100 : 0;
  if (pct < 10 || tank.currentLevel <= tank.minLevel) return { label: "CRITICAL", color: "text-red-600" };
  if (pct < 25) return { label: "LOW", color: "text-amber-600" };
  return { label: "OK", color: "text-green-600" };
}

export default function FuelOverviewPage() {
  const currency = useCurrency();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tanks, setTanks] = useState<TankSummary[]>([]);
  const [recentIssues, setRecentIssues] = useState<RecentIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    Promise.all([
      fetch("/api/fuel-tanks?pageSize=200").then((r) => r.json()),
      fetch(`/api/fuel/consumption-by-period?groupBy=month&from=${monthStart}&to=${monthEnd}`).then((r) => r.json()),
      fetch("/api/fuel-issues?pageSize=10&sortBy=issuedAt&sortDir=desc").then((r) => r.json()),
    ])
      .then(([tanksData, consumptionData, issuesData]) => {
        const allTanks: TankSummary[] = tanksData.data ?? [];
        setTanks(allTanks);

        const lowTanks = allTanks.filter((t) => {
          const pct = t.capacity > 0 ? (t.currentLevel / t.capacity) * 100 : 0;
          return pct < 25;
        }).length;

        const periodRows: { totalLiters?: number; totalCost?: number }[] = consumptionData.data ?? [];
        const totalIssued = periodRows.reduce((s, r) => s + (r.totalLiters ?? 0), 0);
        const totalCost = periodRows.reduce((s, r) => s + (r.totalCost ?? 0), 0);

        setStats({
          totalTanks: allTanks.length,
          lowTanks,
          totalIssuedThisMonth: totalIssued,
          totalCostThisMonth: totalCost,
        });

        setRecentIssues(issuesData.data ?? []);
      })
      .catch(() => toast.error("Failed to load fuel overview"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Fuel Management" description="Overview of fuel tanks, consumption, and costs" />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Fuel className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalTanks ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Tanks</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats?.lowTanks ?? 0}</p>
              <p className="text-sm text-muted-foreground">Low Tanks (&lt;25%)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <Droplets className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(stats?.totalIssuedThisMonth ?? 0).toLocaleString()} L</p>
              <p className="text-sm text-muted-foreground">Issued This Month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{currency} {(stats?.totalCostThisMonth ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-sm text-muted-foreground">Cost This Month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tank Levels */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tank Levels</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tank</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Level</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fill %</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tanks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No tanks found</td>
                    </tr>
                  ) : (
                    tanks.map((tank) => {
                      const pct = tank.capacity > 0 ? (tank.currentLevel / tank.capacity) * 100 : 0;
                      const st = tankStatusLabel(tank);
                      return (
                        <tr key={tank.id} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <Link href={`/fuel/tanks/${tank.id}`} className="font-medium hover:underline">
                              {tank.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{tank.fuelType}</td>
                          <td className="px-4 py-3">{tank.currentLevel.toLocaleString()} / {tank.capacity.toLocaleString()} L</td>
                          <td className="px-4 py-3 w-32">
                            <div className="space-y-1">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: fillColor(pct) }}
                                />
                              </div>
                              <span className="text-xs" style={{ color: fillColor(pct) }}>
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Issues</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vehicle</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Driver</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Liters</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIssues.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No recent issues</td>
                    </tr>
                  ) : (
                    recentIssues.map((issue) => (
                      <tr key={issue.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link href={`/fuel/issues/${issue.id}`} className="font-medium hover:underline">
                            {issue.vehicle?.plateNumber ?? "—"}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {issue.driver ? `${issue.driver.firstName} ${issue.driver.lastName}` : "—"}
                        </td>
                        <td className="px-4 py-3">{issue.quantity.toLocaleString()} L</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(issue.issuedAt), "dd MMM yyyy")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
