"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface TripRow {
  id: string;
  reference: string;
  origin: string;
  destination: string;
  scheduledDeparture: string | null;
  status: string;
  priority: string;
  vehicle?: { plateNumber: string } | null;
  driver?: { employee?: { firstName: string; lastName: string } | null } | null;
}

const PAGE_SIZE = 20;

export default function TripsPage() {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    fetch(`/api/trips?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setTrips(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load trips"))
      .finally(() => setLoading(false));
  }, [page, debounced, statusFilter, dateFrom, dateTo]);

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: TripRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.reference}</code>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row: TripRow) => (
        <span className="text-sm font-medium">{row.vehicle?.plateNumber ?? "—"}</span>
      ),
    },
    {
      key: "driver",
      header: "Driver",
      cell: (row: TripRow) => {
        const emp = row.driver?.employee;
        return (
          <span className="text-sm text-muted-foreground">
            {emp ? `${emp.firstName} ${emp.lastName}` : "—"}
          </span>
        );
      },
    },
    {
      key: "route",
      header: "Origin → Destination",
      cell: (row: TripRow) => (
        <span className="text-sm">
          {row.origin} <span className="text-muted-foreground">→</span> {row.destination}
        </span>
      ),
    },
    {
      key: "scheduledDeparture",
      header: "Scheduled Departure",
      cell: (row: TripRow) => (
        <span className="text-sm text-muted-foreground">
          {row.scheduledDeparture
            ? format(new Date(row.scheduledDeparture), "dd MMM yyyy HH:mm")
            : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: TripRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row: TripRow) => <StatusBadge status={row.priority} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: TripRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/transport/trips/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Trips"
        description="Manage transport trips and dispatches"
        actions={
          <PermissionGuard require="transport:trip:create">
            <Button asChild>
              <Link href="/transport/trips/new">
                <Plus className="h-4 w-4 mr-2" />
                New Trip
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex gap-3 mb-4 flex-wrap items-end">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search reference, route..."
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PLANNED">Planned</SelectItem>
            <SelectItem value="DISPATCHED">Dispatched</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36"
            />
          </div>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={trips}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No trips found"
        emptyDescription="Create your first trip to get started."
      />
    </div>
  );
}
