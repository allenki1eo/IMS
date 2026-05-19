"use client";

import { useState, useEffect } from "react";
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

interface ReceiptRow {
  id: string;
  reference: string;
  tank?: { id: string; name: string } | null;
  supplierName: string | null;
  quantity: number;
  pricePerLiter: number | null;
  totalCost: number | null;
  status: string;
  deliveryNoteRef: string | null;
  createdAt: string;
}

interface TankOption { id: string; name: string; }

const STATUS_FILTERS = [
  { label: "All Statuses", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Confirmed", value: "CONFIRMED" },
];

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tankFilter, setTankFilter] = useState("ALL");
  const [tanks, setTanks] = useState<TankOption[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const PAGE_SIZE = 20;

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/fuel-receipts/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Receipt deleted");
      setDeleteId(null);
      setPage(1);
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete receipt");
    }
  }

  useEffect(() => {
    fetch("/api/fuel-tanks?pageSize=200")
      .then((r) => r.json())
      .then((d) => setTanks(d.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [debounced, statusFilter, tankFilter]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (tankFilter !== "ALL") params.set("tankId", tankFilter);
    fetch(`/api/fuel-receipts?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setReceipts(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load receipts"))
      .finally(() => setLoading(false));
  }, [page, debounced, statusFilter, tankFilter]);

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: ReceiptRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.reference}</code>
      ),
    },
    {
      key: "tank",
      header: "Tank",
      cell: (row: ReceiptRow) => (
        <span className="font-medium">{row.tank?.name ?? "—"}</span>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: (row: ReceiptRow) => (
        <span className="text-muted-foreground">{row.supplierName ?? "—"}</span>
      ),
    },
    {
      key: "quantity",
      header: "Qty (L)",
      cell: (row: ReceiptRow) => <span>{row.quantity.toLocaleString()}</span>,
    },
    {
      key: "pricePerLiter",
      header: "Price/L",
      cell: (row: ReceiptRow) => (
        <span className="text-muted-foreground">
          {row.pricePerLiter != null ? `$${row.pricePerLiter.toFixed(3)}` : "—"}
        </span>
      ),
    },
    {
      key: "totalCost",
      header: "Total Cost",
      cell: (row: ReceiptRow) => (
        <span className="font-medium">
          {row.totalCost != null ? `$${row.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: ReceiptRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (row: ReceiptRow) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {format(new Date(row.createdAt), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: ReceiptRow) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/fuel/receipts/${row.id}`}>View</Link>
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
        title="Fuel Receipts"
        description="Track fuel deliveries and receipts"
        actions={
          <PermissionGuard require="fuel:receipt:create">
            <Button asChild>
              <Link href="/fuel/receipts/new">
                <Plus className="h-4 w-4 mr-2" />
                New Receipt
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by reference or supplier..."
          className="w-full sm:max-w-xs"
        />
        <Select value={tankFilter} onValueChange={setTankFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Tanks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Tanks</SelectItem>
            {tanks.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
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
        data={receipts}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No receipts found"
        emptyDescription="Record your first fuel delivery to get started."
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
