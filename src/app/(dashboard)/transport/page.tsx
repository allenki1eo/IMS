"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Truck, Users, Navigation, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState } from "@/components/shared/LoadingState";
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
  const [stats, setStats] = useState<SummaryStats>({
    totalVehicles: 0,
    activeDrivers: 0,
    activeTrips: 0,
    openIncidents: 0,
  });
  const [recentTrips, setRecentTrips] = useState<TripRow[]>([]);
  const [openIncidents, setOpenIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [incidentsLoading, setIncidentsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [vehiclesRes, driversRes, tripsRes, incidentsRes] = await Promise.all([
        fetch("/api/vehicles?pageSize=1"),
        fetch("/api/drivers?isAvailable=true&pageSize=1"),
        fetch("/api/trips?status=DISPATCHED&pageSize=1"),
        fetch("/api/incidents?status=OPEN&pageSize=1"),
      ]);
      const [vehiclesJson, driversJson, tripsJson, incidentsJson] = await Promise.all([
        vehiclesRes.json(),
        driversRes.json(),
        tripsRes.json(),
        incidentsRes.json(),
      ]);
      setStats({
        totalVehicles: vehiclesJson.meta?.total ?? 0,
        activeDrivers: driversJson.meta?.total ?? 0,
        activeTrips: tripsJson.meta?.total ?? 0,
        openIncidents: incidentsJson.meta?.total ?? 0,
      });
    } catch {
      toast.error("Failed to load summary stats");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      const res = await fetch("/api/trips?pageSize=5&sort=createdAt:desc");
      const json = await res.json();
      setRecentTrips(json.data ?? []);
    } catch {
      toast.error("Failed to load recent trips");
    } finally {
      setTripsLoading(false);
    }
  }, []);

  const fetchOpenIncidents = useCallback(async () => {
    setIncidentsLoading(true);
    try {
      const res = await fetch("/api/incidents?status=OPEN&pageSize=5");
      const json = await res.json();
      setOpenIncidents(json.data ?? []);
    } catch {
      toast.error("Failed to load open incidents");
    } finally {
      setIncidentsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecentTrips();
    fetchOpenIncidents();
  }, [fetchStats, fetchRecentTrips, fetchOpenIncidents]);

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

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Transport & Fleet"
        description="Overview of vehicles, drivers, trips, and incidents"
      />

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Vehicles"
          value={stats.totalVehicles}
          icon={Truck}
          href="/transport/vehicles"
        />
        <StatCard
          title="Available Drivers"
          value={stats.activeDrivers}
          icon={Users}
          href="/transport/drivers"
        />
        <StatCard
          title="Active Trips"
          value={stats.activeTrips}
          icon={Navigation}
          href="/transport/trips"
          highlight={stats.activeTrips > 0}
        />
        <StatCard
          title="Open Incidents"
          value={stats.openIncidents}
          icon={AlertTriangle}
          href="/transport/incidents"
          highlight={stats.openIncidents > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Trips</h2>
          <DataTable
            columns={tripColumns}
            data={recentTrips}
            loading={tripsLoading}
            emptyTitle="No trips yet"
            emptyDescription="Trips will appear here once created."
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Open Incidents</h2>
          <DataTable
            columns={incidentColumns}
            data={openIncidents}
            loading={incidentsLoading}
            emptyTitle="No open incidents"
            emptyDescription="All incidents have been resolved."
          />
        </div>
      </div>
    </div>
  );
}
