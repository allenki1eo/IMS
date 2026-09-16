"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Truck, Users, Navigation, AlertTriangle, Plus } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryStats {
  totalVehicles: number;
  activeDrivers: number;
  activeTrips: number;
  openIncidents: number;
}

interface TripRow {
  id: string;
  reference: string;
  vehicle?: { plateNumber: string } | null;
  driver?: { firstName?: string | null; lastName?: string | null; employee?: { fullName: string } | null } | null;
  origin: string;
  destination: string;
  status: string;
}

interface IncidentRow {
  id: string;
  vehicle?: { plateNumber: string } | null;
  incidentType: string;
  incidentDate: string;
  status: string;
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

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  highlight,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <Card className={highlight ? "border-amber-400" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? "text-amber-500" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${highlight ? "text-amber-600" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href} className="hover:opacity-90 transition-opacity">{inner}</Link>;
  return inner;
}

export default function TransportOverviewPage() {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [recentTrips, setRecentTrips] = useState<TripRow[]>([]);
  const [openIncidents, setOpenIncidents] = useState<IncidentRow[]>([]);
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

    try {
      const signal = controller.signal;
      // Parallel fan-out (no waterfall): stats + recent lists settle together.
      const results = await Promise.allSettled([
        fetchJson("/api/vehicles?pageSize=1", signal),
        fetchJson("/api/drivers?isAvailable=true&pageSize=1", signal),
        fetchJson("/api/trips?status=DISPATCHED&pageSize=1", signal),
        fetchJson("/api/incidents?status=OPEN&pageSize=1", signal),
        fetchJson("/api/trips?pageSize=5&sort=createdAt:desc", signal),
        fetchJson("/api/incidents?status=OPEN&pageSize=5", signal),
      ]);

      if (signal.aborted) {
        if (timedOut) {
          setLoadError("Request timed out. Check your connection and try again.");
          toast.error("Transport overview timed out");
        }
        return;
      }

      const value = (idx: number) => {
        const r = results[idx];
        return r.status === "fulfilled" ? r.value : null;
      };

      const failures = results.filter((r) => r.status === "rejected");
      const criticalFailed =
        results[4].status === "rejected" && results[5].status === "rejected";

      // Never leave an infinite skeleton — lasting error + retry.
      if (failures.length === results.length || criticalFailed) {
        const firstReason =
          failures[0] && failures[0].status === "rejected"
            ? failures[0].reason
            : null;
        const msg =
          firstReason instanceof Error
            ? firstReason.message
            : controller.signal.aborted
              ? "Request timed out"
              : "Failed to load transport overview";
        setStats(null);
        setRecentTrips([]);
        setOpenIncidents([]);
        setLoadError(msg);
        toast.error(msg);
        return;
      }

      setStats({
        totalVehicles: value(0)?.meta?.total ?? 0,
        activeDrivers: value(1)?.meta?.total ?? 0,
        activeTrips: value(2)?.meta?.total ?? 0,
        openIncidents: value(3)?.meta?.total ?? 0,
      });
      setRecentTrips(value(4)?.data ?? []);
      setOpenIncidents(value(5)?.data ?? []);
      setLoadError(null);

      if (failures.length > 0) {
        toast.error("Some transport stats failed to load");
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setLoadError("Request timed out. Check your connection and try again.");
        toast.error("Transport overview timed out");
      } else {
        const msg =
          err instanceof Error ? err.message : "Failed to load transport overview";
        setLoadError(msg);
        toast.error(msg);
      }
      setStats(null);
      setRecentTrips([]);
      setOpenIncidents([]);
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

  const tripColumns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: TripRow) => (
        <Link href={`/transport/trips/${row.id}`} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:underline">
          {row.reference}
        </Link>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row: TripRow) => (
        <span className="text-sm">{row.vehicle?.plateNumber ?? "—"}</span>
      ),
    },
    {
      key: "driver",
      header: "Driver",
      cell: (row: TripRow) => {
        const name = row.driver?.employee?.fullName ??
          ([row.driver?.firstName, row.driver?.lastName].filter(Boolean).join(" ") || "—");
        return (
          <span className="text-sm text-muted-foreground">
            {name}
          </span>
        );
      },
    },
    {
      key: "route",
      header: "Route",
      cell: (row: TripRow) => (
        <span className="text-sm">
          {row.origin} <span className="text-muted-foreground">→</span> {row.destination}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: TripRow) => <StatusBadge status={row.status} />,
    },
  ];

  const incidentColumns = [
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row: IncidentRow) => (
        <span className="text-sm font-medium">{row.vehicle?.plateNumber ?? "—"}</span>
      ),
    },
    {
      key: "incidentType",
      header: "Type",
      cell: (row: IncidentRow) => (
        <span className="text-sm">{row.incidentType}</span>
      ),
    },
    {
      key: "incidentDate",
      header: "Date",
      cell: (row: IncidentRow) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.incidentDate), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: IncidentRow) => <StatusBadge status={row.status} />,
    },
  ];

  if (loading) return <LoadingState text="Loading transport overview..." />;
  if (loadError) {
    return (
      <ErrorState
        title="Could not load transport overview"
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
        title="Transport & Fleet"
        description="Overview of vehicles, drivers, trips, and incidents"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/transport/vehicles">Vehicles</Link>
            </Button>
            <PermissionGuard require="transport:trip:create">
              <Button asChild>
                <Link href="/transport/trips/new">
                  <Plus className="h-4 w-4" />
                  New trip
                </Link>
              </Button>
            </PermissionGuard>
          </>
        }
      />

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Vehicles"
          value={stats?.totalVehicles ?? 0}
          icon={Truck}
          href="/transport/vehicles"
        />
        <StatCard
          title="Available Drivers"
          value={stats?.activeDrivers ?? 0}
          icon={Users}
          href="/transport/drivers"
        />
        <StatCard
          title="Active Trips"
          value={stats?.activeTrips ?? 0}
          icon={Navigation}
          href="/transport/trips"
          highlight={(stats?.activeTrips ?? 0) > 0}
        />
        <StatCard
          title="Open Incidents"
          value={stats?.openIncidents ?? 0}
          icon={AlertTriangle}
          href="/transport/incidents"
          highlight={(stats?.openIncidents ?? 0) > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Trips</h2>
          <DataTable
            columns={tripColumns}
            data={recentTrips}
            emptyTitle="No trips yet"
            emptyDescription="Plan a trip to dispatch vehicles and track routes."
            emptyAction={
              <Button variant="outline" size="sm" asChild>
                <Link href="/transport/trips/new">Create trip</Link>
              </Button>
            }
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Open Incidents</h2>
          <DataTable
            columns={incidentColumns}
            data={openIncidents}
            emptyTitle="No open incidents"
            emptyDescription="Nothing to resolve — report an incident if something goes wrong on the road."
            emptyAction={
              <Button variant="outline" size="sm" asChild>
                <Link href="/transport/incidents/new">Report incident</Link>
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}
