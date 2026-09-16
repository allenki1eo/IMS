"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Fuel, TrendingDown, Droplets, DollarSign, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { isTankInService, tankLevelStatus } from "./_components/fuel-ui";

interface TankSummary {
  id: string;
  name: string;
  fuelType: string;
  currentLevel: number;
  capacity: number;
  minLevel: number;
  status: string;
  _count?: { receipts?: number; issues?: number };
}

interface RecentIssue {
  id: string;
  reference: string;
  vehicle?: { plateNumber: string } | null;
  driver?: { firstName?: string | null; lastName?: string | null; employee?: { fullName: string } | null } | null;
  quantityLiters: number;
  issuedAt: string;
}

interface Stats {
  totalTanks: number;
  lowTanks: number;
  totalIssuedThisMonth: number;
  totalCostThisMonth: number;
}

const OVERVIEW_TIMEOUT_MS = 15000;

async function fetchJson(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal, credentials: "same-origin" });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const message =
      (body && (body.error || body.message)) ||
      `Request failed (${res.status})`;
    throw new Error(typeof message === "string" ? message : "Request failed");
  }
  return body ?? {};
}

function fillColor(pct: number) {
  if (pct > 50) return "#22c55e";
  if (pct > 25) return "#f59e0b";
  return "#ef4444";
}

export default function FuelOverviewPage() {
  const currency = useCurrency();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tanks, setTanks] = useState<TankSummary[]>([]);
  const [recentIssues, setRecentIssues] = useState<RecentIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadOverview = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, OVERVIEW_TIMEOUT_MS);

    setLoading(true);
    setLoadError(null);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    try {
      const signal = controller.signal;
      const results = await Promise.allSettled([
        fetchJson("/api/fuel-tanks?pageSize=200", signal),
        fetchJson(`/api/fuel/consumption-by-period?groupBy=month&from=${monthStart}&to=${monthEnd}`, signal),
        fetchJson("/api/fuel-issues?pageSize=10&sortBy=issuedAt&sortDir=desc", signal),
      ]);

      if (signal.aborted) {
        if (timedOut) {
          setLoadError("Request timed out. Check your connection and try again.");
          toast.error("Fuel overview timed out");
        }
        return;
      }

      const value = (idx: number) => {
        const r = results[idx];
        return r.status === "fulfilled" ? r.value : null;
      };

      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length === results.length || results[0].status === "rejected") {
        const firstReason =
          failures[0] && failures[0].status === "rejected" ? failures[0].reason : null;
        const msg =
          firstReason instanceof Error
            ? firstReason.message
            : "Failed to load fuel overview";
        setStats(null);
        setTanks([]);
        setRecentIssues([]);
        setLoadError(msg);
        toast.error(msg);
        return;
      }

      const allTanks: TankSummary[] = value(0)?.data ?? [];
      setTanks(allTanks);

      const lowTanks = allTanks.filter((t) => {
        // Never-filled empty tanks are not "low" — they await first receipt.
        if (!isTankInService(t) && t.currentLevel === 0) return false;
        const pct = t.capacity > 0 ? (t.currentLevel / t.capacity) * 100 : 0;
        return pct < 25;
      }).length;

      const periodRows: { totalLiters?: number; totalCost?: number }[] = value(1)?.data ?? [];
      const totalIssued = periodRows.reduce((s, r) => s + (r.totalLiters ?? 0), 0);
      const totalCost = periodRows.reduce((s, r) => s + (r.totalCost ?? 0), 0);

      setStats({
        totalTanks: allTanks.length,
        lowTanks,
        totalIssuedThisMonth: totalIssued,
        totalCostThisMonth: totalCost,
      });

      setRecentIssues(value(2)?.data ?? []);
      setLoadError(null);

      if (failures.length > 0) {
        toast.error("Some fuel stats failed to load");
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setLoadError("Request timed out. Check your connection and try again.");
        toast.error("Fuel overview timed out");
      } else {
        const msg = err instanceof Error ? err.message : "Failed to load fuel overview";
        setLoadError(msg);
        toast.error(msg);
      }
      setStats(null);
      setTanks([]);
      setRecentIssues([]);
    } finally {
      window.clearTimeout(timeoutId);
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    return () => {
      abortRef.current?.abort();
    };
  }, [loadOverview, retryCount]);

  if (loading) return <LoadingState text="Loading fuel overview..." />;
  if (loadError) {
    return (
      <ErrorState
        title="Could not load fuel overview"
        description={loadError}
        onRetry={() => {
          setRetryCount((c) => c + 1);
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Fuel Management"
        description="Overview of fuel tanks, consumption, and costs"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/fuel/tanks">Manage tanks</Link>
            </Button>
            <PermissionGuard require="fuel:issue:create">
              <Button asChild>
                <Link href="/fuel/issues/new">
                  <Plus className="h-4 w-4" />
                  Issue fuel
                </Link>
              </Button>
            </PermissionGuard>
          </>
        }
      />

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

      <div className="grid gap-6 lg:grid-cols-2">
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
                      <td colSpan={5}>
                        <EmptyState
                          compact
                          title="No tanks yet"
                          description="Register a storage tank, then record a receipt when fuel arrives."
                          action={
                            <Button variant="outline" size="sm" asChild>
                              <Link href="/fuel/tanks/new">Add tank</Link>
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    tanks.map((tank) => {
                      const pct = tank.capacity > 0 ? (tank.currentLevel / tank.capacity) * 100 : 0;
                      const st = tankLevelStatus(tank);
                      const barColor =
                        !isTankInService(tank) && tank.currentLevel === 0
                          ? "#94a3b8"
                          : fillColor(pct);
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
                                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
                                />
                              </div>
                              <span className="text-xs" style={{ color: barColor }}>
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
                      <td colSpan={4}>
                        <EmptyState
                          compact
                          title="No recent issues"
                          description="After tanks have fuel, issue liters to a vehicle from here."
                          action={
                            <Button variant="outline" size="sm" asChild>
                              <Link href="/fuel/issues/new">Issue fuel</Link>
                            </Button>
                          }
                        />
                      </td>
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
                          {issue.driver
                            ? (issue.driver.employee?.fullName ?? [issue.driver.firstName, issue.driver.lastName].filter(Boolean).join(" ") ?? "—")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">{issue.quantityLiters.toLocaleString()} L</td>
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
