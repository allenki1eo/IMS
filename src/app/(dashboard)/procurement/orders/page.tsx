"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { formatDate, formatMoney, ORDER_STATUSES } from "../_components/procurement-ui";

interface OrderRow {
  id: string;
  reference: string;
  status: string;
  expectedDelivery?: string | null;
  subtotal: number;
  totalAmount: number;
  currency: string;
  supplier?: { id: string; code: string; name: string } | null;
  request?: { id: string; reference: string } | null;
  _count?: { lines: number };
}

const PAGE_SIZE = 20;

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("status");
    if (fromQuery) setStatus(fromQuery);
  }, []);

  useEffect(() => { setPage(1); }, [debounced, status]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (status !== "ALL") params.set("status", status);
    fetch(`/api/procurement/orders?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load purchase orders"))
      .finally(() => setLoading(false));
  }, [page, debounced, status]);

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: OrderRow) => (
        <Link href={`/procurement/orders/${row.id}`} className="font-semibold hover:underline">{row.reference}</Link>
      ),
    },
    { key: "supplier", header: "Supplier", cell: (row: OrderRow) => <span>{row.supplier?.name ?? "-"}</span> },
    { key: "request", header: "Request", cell: (row: OrderRow) => row.request ? <Link href={`/procurement/requests/${row.request.id}`} className="hover:underline">{row.request.reference}</Link> : <span className="text-muted-foreground">-</span> },
    { key: "status", header: "Status", cell: (row: OrderRow) => <StatusBadge status={row.status} /> },
    { key: "expectedDelivery", header: "Expected", cell: (row: OrderRow) => <span className="text-muted-foreground">{formatDate(row.expectedDelivery)}</span> },
    { key: "lines", header: "Lines", cell: (row: OrderRow) => <span>{row._count?.lines ?? 0}</span> },
    { key: "total", header: "Total", cell: (row: OrderRow) => <span>{formatMoney(row.totalAmount, row.currency)}</span> },
    {
      key: "actions",
      header: "Actions",
      cell: (row: OrderRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/procurement/orders/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Issue orders to suppliers and track receiving"
        actions={
          <PermissionGuard require="procurement:order:create">
            <Button asChild>
              <Link href="/procurement/orders/new"><Plus className="h-4 w-4 mr-2" />New Order</Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search orders..." className="w-full sm:max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {ORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
        emptyTitle="No purchase orders found"
        emptyDescription="Create an order from an approved request or directly for a supplier."
      />
    </div>
  );
}

