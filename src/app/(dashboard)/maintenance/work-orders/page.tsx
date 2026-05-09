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

function priorityClass(priority: string): string {
  switch (priority) {
    case "CRITICAL": return "bg-red-100 text-red-700";
    case "HIGH": return "bg-orange-100 text-orange-700";
    case "MEDIUM": return "bg-yellow-100 text-yellow-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const PAGE_SIZE = 20;

  useEffect(() => { setPage(1); }, [debounced, status, priority]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
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
  }, [page, debounced, status, priority]);

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
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass(row.priority)}`}>
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
      header: "Actions",
      cell: (row: WorkOrderRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/maintenance/work-orders/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

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

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by reference or type..."
          className="max-w-sm"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={workOrders}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No work orders found"
        emptyDescription="Create your first work order to get started."
      />
    </div>
  );
}
