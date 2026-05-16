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

interface CustomerRef {
  id: string;
  name: string;
  code: string;
}

interface OrderRow {
  id: string;
  reference: string;
  customer: CustomerRef | null;
  status: string;
  priority: string;
  totalAmount: number;
  currency: string;
  orderDate: string;
  _count: { lines: number };
}

const STATUS_FILTERS = [
  { label: "All Status", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Dispatched", value: "DISPATCHED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

function formatMoney(amount: number, currency = "TZS") {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function SalesOrdersPage() {
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
    fetch(`/api/sales/orders?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.data?.data ?? d.data ?? []);
        setTotal(d.data?.meta?.total ?? d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [page, debounced, status]);

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: OrderRow) => (
        <Link href={`/sales/orders/${row.id}`} className="font-semibold hover:underline">
          {row.reference}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row: OrderRow) => (
        <span className="text-muted-foreground">{row.customer?.name ?? "—"}</span>
      ),
    },
    {
      key: "totalAmount",
      header: "Total",
      cell: (row: OrderRow) => (
        <span className="font-medium">{formatMoney(row.totalAmount, row.currency)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: OrderRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row: OrderRow) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          row.priority === "URGENT" ? "bg-red-100 text-red-700"
          : row.priority === "HIGH" ? "bg-orange-100 text-orange-700"
          : "bg-muted text-muted-foreground"
        }`}>
          {row.priority}
        </span>
      ),
    },
    {
      key: "lines",
      header: "Lines",
      cell: (row: OrderRow) => <span className="text-muted-foreground">{row._count?.lines ?? 0}</span>,
    },
    {
      key: "orderDate",
      header: "Order Date",
      cell: (row: OrderRow) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {format(new Date(row.orderDate), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: OrderRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/sales/orders/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        description="View and manage all customer sales orders"
        actions={
          <PermissionGuard require="sales:order:create">
            <Button asChild>
              <Link href="/sales/orders/new">
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
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
        emptyTitle="No sales orders found"
        emptyDescription="Create your first sales order or wait for webhook events from your sales app."
      />
    </div>
  );
}
