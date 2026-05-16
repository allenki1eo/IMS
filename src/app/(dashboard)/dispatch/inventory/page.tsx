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

interface LotRow {
  id: string;
  product?: { code: string; name: string } | null;
  lotNumber?: string | null;
  quantityIn: number;
  quantityOut: number;
  availableQty: number;
  bestBefore?: string | null;
  warehouse?: { name: string } | null;
  status: string;
}

const STATUS_FILTERS = [
  { label: "All Status", value: "ALL" },
  { label: "Available", value: "AVAILABLE" },
  { label: "Depleted", value: "DEPLETED" },
  { label: "Recalled", value: "RECALLED" },
];

export default function FgInventoryPage() {
  const [lots, setLots] = useState<LotRow[]>([]);
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
    fetch(`/api/dispatch/inventory?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setLots(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load inventory"))
      .finally(() => setLoading(false));
  }, [page, debounced, status]);

  const columns = [
    {
      key: "product",
      header: "Product",
      cell: (row: LotRow) => (
        <Link href={`/dispatch/inventory/${row.id}`} className="font-semibold hover:underline">
          {row.product ? `${row.product.code} — ${row.product.name}` : "—"}
        </Link>
      ),
    },
    {
      key: "lotNumber",
      header: "Lot Number",
      cell: (row: LotRow) => (
        <span className="text-muted-foreground">{row.lotNumber ?? "—"}</span>
      ),
    },
    {
      key: "quantityIn",
      header: "Qty In",
      cell: (row: LotRow) => <span>{row.quantityIn.toLocaleString()}</span>,
    },
    {
      key: "quantityOut",
      header: "Qty Out",
      cell: (row: LotRow) => <span>{row.quantityOut.toLocaleString()}</span>,
    },
    {
      key: "availableQty",
      header: "Available",
      cell: (row: LotRow) => <span className="font-medium">{row.availableQty.toLocaleString()}</span>,
    },
    {
      key: "bestBefore",
      header: "Best Before",
      cell: (row: LotRow) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {row.bestBefore ? format(new Date(row.bestBefore), "dd MMM yyyy") : "—"}
        </span>
      ),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      cell: (row: LotRow) => (
        <span className="text-muted-foreground">{row.warehouse?.name ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: LotRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: LotRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dispatch/inventory/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="FG Inventory"
        description="Manage finished goods lots and stock levels"
        actions={
          <PermissionGuard require="dispatch:lot:create">
            <Button asChild>
              <Link href="/dispatch/inventory/new">
                <Plus className="h-4 w-4 mr-2" />
                Receive Stock
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by product name or code..."
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
        data={lots}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No FG lots found"
        emptyDescription="Receive finished goods stock to get started."
      />
    </div>
  );
}
