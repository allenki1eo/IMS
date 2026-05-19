"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, LayoutList, LayoutDashboard } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KanbanBoard, type KanbanCard } from "@/components/shared/KanbanBoard";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const STATUS_FILTERS = [
  { value: "ALL", label: "All Status" },
  { value: "PLANNED", label: "Planned" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const KANBAN_COLUMNS = [
  { id: "PLANNED", label: "Planned", color: "#94a3b8", headerClass: "bg-slate-100 dark:bg-slate-900" },
  { id: "DISPATCHED", label: "Dispatched", color: "#3b82f6", headerClass: "bg-blue-50 dark:bg-blue-950" },
  { id: "COMPLETED", label: "Completed", color: "#22c55e", headerClass: "bg-emerald-50 dark:bg-emerald-950" },
  { id: "CANCELLED", label: "Cancelled", color: "#ef4444", headerClass: "bg-red-50 dark:bg-red-950" },
];

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  LOW: "bg-gray-100 text-gray-600",
};

export default function TripsPage() {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [view, setView] = useState<"table" | "kanban">("table");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const hasFilters = debounced !== "" || statusFilter !== "ALL" || !!dateFrom || !!dateTo;

  useEffect(() => { setPage(1); }, [debounced, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(view === "kanban" ? 200 : PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    fetch(`/api/trips?${params}`)
      .then((r) => r.json())
      .then((d) => { setTrips(d.data ?? []); setTotal(d.meta?.total ?? 0); })
      .catch(() => toast.error("Failed to load trips"))
      .finally(() => setLoading(false));
  }, [page, debounced, statusFilter, dateFrom, dateTo, view]);

  const columns = [
    {
      key: "reference", header: "Reference", sortable: true,
      cell: (row: TripRow) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.reference}</code>,
    },
    {
      key: "vehicle", header: "Vehicle",
      cell: (row: TripRow) => <span className="text-sm font-medium">{row.vehicle?.plateNumber ?? "—"}</span>,
    },
    {
      key: "driver", header: "Driver",
      cell: (row: TripRow) => {
        const emp = row.driver?.employee;
        return <span className="text-sm text-muted-foreground">{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</span>;
      },
    },
    {
      key: "route", header: "Route",
      cell: (row: TripRow) => (
        <span className="text-sm">{row.origin} <span className="text-muted-foreground">→</span> {row.destination}</span>
      ),
    },
    {
      key: "scheduledDeparture", header: "Departure", sortable: true,
      cell: (row: TripRow) => (
        <span className="text-sm text-muted-foreground">
          {row.scheduledDeparture ? format(new Date(row.scheduledDeparture), "dd MMM yyyy HH:mm") : "—"}
        </span>
      ),
    },
    { key: "status", header: "Status", cell: (row: TripRow) => <StatusBadge status={row.status} /> },
    { key: "priority", header: "Priority", cell: (row: TripRow) => <StatusBadge status={row.priority} /> },
    {
      key: "actions", header: "",
      cell: (row: TripRow) => (
        <Button variant="outline" size="sm" asChild><Link href={`/transport/trips/${row.id}`}>View</Link></Button>
      ),
    },
  ];

  const kanbanCards: KanbanCard<TripRow>[] = trips.map((t) => ({
    id: t.id,
    column: t.status,
    title: t.reference,
    subtitle: `${t.origin} → ${t.destination}`,
    href: `/transport/trips/${t.id}`,
    badge: (
      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${PRIORITY_COLOR[t.priority] ?? "bg-gray-100 text-gray-600"}`}>
        {t.priority}
      </span>
    ),
    meta: (
      <div className="flex flex-col gap-0.5">
        {t.vehicle?.plateNumber && <span>{t.vehicle.plateNumber}</span>}
        {t.scheduledDeparture && <span>{format(new Date(t.scheduledDeparture), "dd MMM HH:mm")}</span>}
      </div>
    ),
  }));

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

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search reference, route..."
          filters={[{ value: statusFilter, onChange: setStatusFilter, placeholder: "All Status", options: STATUS_FILTERS }]}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          hasActiveFilters={hasFilters}
          onReset={() => { setSearch(""); setStatusFilter("ALL"); setDateFrom(""); setDateTo(""); }}
        />

        {/* View toggle */}
        <div className="flex items-center rounded-lg border bg-muted p-1 gap-1">
          <button
            onClick={() => setView("table")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "table" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutList className="h-3.5 w-3.5" /> Table
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "kanban" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> Board
          </button>
        </div>
      </div>

      {view === "table" ? (
        <DataTable
          columns={columns}
          data={trips}
          loading={loading}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          exportable
          exportFilename="trips"
          emptyTitle="No trips found"
          emptyDescription="Create your first trip to get started."
        />
      ) : (
        <KanbanBoard
          columns={KANBAN_COLUMNS}
          cards={kanbanCards}
          loading={loading}
          emptyLabel="No trips"
        />
      )}
    </div>
  );
}
