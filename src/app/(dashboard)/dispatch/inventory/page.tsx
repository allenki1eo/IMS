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

const PAGE_SIZE = 20;

export default function FgInventoryPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (status !== "ALL") params.set("status", status);
  const { data: lots, total, loading, mutate } = usePagedData<LotRow>(`/api/dispatch/inventory?${params}`);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/dispatch/inventory/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Lot deleted");
      setDeleteId(null);
      mutate();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete lot");
    }
  }

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dispatch/inventory/${row.id}`}>View</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
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
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by product name or code..."
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
        data={lots}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No FG lots found"
        emptyDescription="Receive finished goods stock to get started."
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
