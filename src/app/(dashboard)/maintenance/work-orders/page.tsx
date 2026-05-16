"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, LayoutList, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KanbanBoard, type KanbanCard } from "@/components/shared/KanbanBoard";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface WorkOrderRow {
  id: string;
  reference: string;
  vehicle?: { plateNumber: string } | null;
  maintenanceType: string;
  priority: string;
  status: string;
  assignedTo?: { firstName: string; lastName: string } | null;
  estimatedCost?: number | null;
  createdAt: string;
}

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { label: "All Status", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const PRIORITY_FILTERS = [
  { label: "All Priority", value: "ALL" },
  { label: "Critical", value: "CRITICAL" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
];

const KANBAN_COLUMNS = [
  { id: "PENDING", label: "Pending", color: "#94a3b8", headerClass: "bg-slate-100 dark:bg-slate-900" },
  { id: "IN_PROGRESS", label: "In Progress", color: "#3b82f6", headerClass: "bg-blue-50 dark:bg-blue-950" },
  { id: "COMPLETED", label: "Completed", color: "#22c55e", headerClass: "bg-emerald-50 dark:bg-emerald-950" },
  { id: "CANCELLED", label: "Cancelled", color: "#ef4444", headerClass: "bg-red-50 dark:bg-red-950" },
];

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-gray-100 text-gray-600",
};

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [view, setView] = useState<"table" | "kanban">("table");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const hasFilters = debounced !== "" || status !== "ALL" || priority !== "ALL";

  useEffect(() => { setPage(1); }, [debounced, status, priority]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(view === "kanban" ? 200 : PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (status !== "ALL") params.set("status", status);
    if (priority !== "ALL") params.set("priority", priority);
    fetch(`/api/maintenance/work-orders?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setWorkOrders(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load work orders"))
      .finally(() => setLoading(false));
  }, [page, debounced, status, priority, view]);

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: WorkOrderRow) => (
        <Link href={`/maintenance/work-orders/${row.id}`} className="font-semibold hover:underline">
          {row.reference}
        </Link>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row: WorkOrderRow) => (
        <span className="text-muted-foreground">{row.vehicle?.plateNumber ?? "—"}</span>
      ),
    },
    {
      key: "maintenanceType",
      header: "Type",
      cell: (row: WorkOrderRow) => (
        <span className="text-sm">{row.maintenanceType.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row: WorkOrderRow) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLOR[row.priority] ?? "bg-gray-100 text-gray-600"}`}>
          {row.priority}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: WorkOrderRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "assignedTo",
      header: "Assigned To",
      cell: (row: WorkOrderRow) => (
        <span className="text-muted-foreground">
          {row.assignedTo ? `${row.assignedTo.firstName} ${row.assignedTo.lastName}` : "—"}
        </span>
      ),
    },
    {
      key: "estimatedCost",
      header: "Est. Cost",
      cell: (row: WorkOrderRow) => (
        <span>
          {row.estimatedCost != null
            ? `$${row.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row: WorkOrderRow) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {format(new Date(row.createdAt), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: WorkOrderRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/maintenance/work-orders/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  const kanbanCards: KanbanCard<WorkOrderRow>[] = workOrders.map((wo) => ({
    id: wo.id,
    column: wo.status,
    title: wo.reference,
    subtitle: wo.maintenanceType.replace(/_/g, " "),
    href: `/maintenance/work-orders/${wo.id}`,
    badge: (
      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${PRIORITY_COLOR[wo.priority] ?? "bg-gray-100 text-gray-600"}`}>
        {wo.priority}
      </span>
    ),
    meta: (
      <div className="flex flex-col gap-0.5">
        {wo.vehicle?.plateNumber && <span>{wo.vehicle.plateNumber}</span>}
        {wo.assignedTo && <span>{wo.assignedTo.firstName} {wo.assignedTo.lastName}</span>}
      </div>
    ),
  }));

  return (
    <div>
      <PageHeader
        title="Work Orders"
        description="Manage maintenance work orders"
        actions={
          <PermissionGuard require="maintenance:workorder:create">
            <Button asChild>
              <Link href="/maintenance/work-orders/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Work Order
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by reference or type..."
          filters={[
            { value: status, onChange: setStatus, placeholder: "All Status", options: STATUS_FILTERS },
            { value: priority, onChange: setPriority, placeholder: "All Priority", options: PRIORITY_FILTERS },
          ]}
          hasActiveFilters={hasFilters}
          onReset={() => { setSearch(""); setStatus("ALL"); setPriority("ALL"); }}
        />

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
          data={workOrders}
          loading={loading}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          exportable
          exportFilename="work-orders"
          emptyTitle="No work orders found"
          emptyDescription="Create your first work order to get started."
        />
      ) : (
        <KanbanBoard
          columns={KANBAN_COLUMNS}
          cards={kanbanCards}
          loading={loading}
          emptyLabel="No work orders"
        />
      )}
    </div>
  );
}
