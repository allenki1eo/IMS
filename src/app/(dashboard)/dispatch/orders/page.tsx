"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
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
import { usePagedData } from "@/hooks/usePagedData";

interface OrderRow {
  id: string;
  reference: string;
  customerName: string;
  status: string;
  scheduledDate?: string | null;
  vehicle?: { plateNumber: string } | null;
  lineCount?: number;
}

const STATUS_FILTERS = [
  { label: "All Status", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Dispatched", value: "DISPATCHED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const PAGE_SIZE = 20;

export default function DispatchOrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (status !== "ALL") params.set("status", status);
  const { data: orders, total, loading, mutate } = usePagedData<OrderRow>(`/api/dispatch/orders?${params}`);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/dispatch/orders/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Dispatch order deleted");
      setDeleteId(null);
      mutate();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? d.message ?? "Failed to delete dispatch order");
    }
  }

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: OrderRow) => (
        <Link href={`/dispatch/orders/${row.id}`} className="font-semibold hover:underline">
          {row.reference}
        </Link>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      cell: (row: OrderRow) => <span>{row.customerName}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: OrderRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "scheduledDate",
      header: "Scheduled Date",
      cell: (row: OrderRow) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {row.scheduledDate ? format(new Date(row.scheduledDate), "dd MMM yyyy") : "—"}
        </span>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row: OrderRow) => (
        <span className="text-muted-foreground">{row.vehicle?.plateNumber ?? "—"}</span>
      ),
    },
    {
      key: "lineCount",
      header: "Lines",
      cell: (row: OrderRow) => (
        <span className="text-muted-foreground">{row.lineCount ?? 0}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: OrderRow) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dispatch/orders/${row.id}`}>View</Link>
          </Button>
          {row.status === "DRAFT" && row.lineCount === 0 && (
            <PermissionGuard require="dispatch:order:delete">
              <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </PermissionGuard>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dispatch Orders"
        description="Manage outbound finished goods dispatch orders"
        actions={
          <PermissionGuard require="dispatch:order:create">
            <Button asChild>
              <Link href="/dispatch/orders/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Order
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by reference or customer..."
          className="w-full sm:max-w-xs"
        />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No dispatch orders found"
        emptyDescription="Create your first dispatch order to get started."
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
