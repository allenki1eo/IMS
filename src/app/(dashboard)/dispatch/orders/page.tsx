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

export default function DispatchOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const PAGE_SIZE = 20;

  useEffect(() => { setPage(1); }, [debounced, status]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (status !== "ALL") params.set("status", status);
    fetch(`/api/dispatch/orders?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load dispatch orders"))
      .finally(() => setLoading(false));
  }, [page, debounced, status]);

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
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dispatch/orders/${row.id}`}>View</Link>
        </Button>
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
          onChange={setSearch}
          placeholder="Search by reference or customer..."
          className="w-full sm:max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
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
    </div>
  );
}
