"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface VehicleOption {
  id: string;
  plateNumber: string;
}

interface ScheduleRow {
  id: string;
  vehicle?: { plateNumber: string } | null;
  maintenanceType: string;
  intervalKm?: number | null;
  intervalDays?: number | null;
  nextDueAt?: string | null;
  nextDueOdometer?: number | null;
  status: string;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehicleId, setVehicleId] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const PAGE_SIZE = 20;

  useEffect(() => {
    fetch("/api/vehicles?pageSize=200")
      .then((r) => r.json())
      .then((d) => setVehicles(d.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [debounced, vehicleId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (vehicleId !== "ALL") params.set("vehicleId", vehicleId);
    fetch(`/api/maintenance/schedules?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setSchedules(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load schedules"))
      .finally(() => setLoading(false));
  }, [page, debounced, vehicleId]);

  const columns = [
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row: ScheduleRow) => (
        <span className="font-medium">{row.vehicle?.plateNumber ?? "—"}</span>
      ),
    },
    {
      key: "maintenanceType",
      header: "Type",
      cell: (row: ScheduleRow) => (
        <span className="text-sm">{row.maintenanceType.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "interval",
      header: "Interval",
      cell: (row: ScheduleRow) => {
        const parts: string[] = [];
        if (row.intervalKm) parts.push(`${row.intervalKm.toLocaleString()} km`);
        if (row.intervalDays) parts.push(`${row.intervalDays} days`);
        return <span className="text-muted-foreground">{parts.join(" / ") || "—"}</span>;
      },
    },
    {
      key: "nextDueAt",
      header: "Next Due Date",
      cell: (row: ScheduleRow) => (
        <span className="text-muted-foreground">
          {row.nextDueAt ? format(new Date(row.nextDueAt), "dd MMM yyyy") : "—"}
        </span>
      ),
    },
    {
      key: "nextDueOdometer",
      header: "Next Due Odometer",
      cell: (row: ScheduleRow) => (
        <span className="text-muted-foreground">
          {row.nextDueOdometer ? `${row.nextDueOdometer.toLocaleString()} km` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: ScheduleRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: ScheduleRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/maintenance/schedules/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Maintenance Schedules"
        description="Manage preventive maintenance schedules for vehicles"
        actions={
          <PermissionGuard require="maintenance:schedule:create">
            <Button asChild>
              <Link href="/maintenance/schedules/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search schedules..."
          className="w-full sm:max-w-xs"
        />
        <Select value={vehicleId} onValueChange={setVehicleId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Vehicles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Vehicles</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.plateNumber}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={schedules}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No schedules found"
        emptyDescription="Add your first maintenance schedule to get started."
      />
    </div>
  );
}
