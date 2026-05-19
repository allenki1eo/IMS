"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { format } from "date-fns";
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

interface AdjustmentRow {
  id: string;
  reference: string;
  reason: string;
  status: string;
  createdAt: string;
  warehouse?: { name: string } | null;
  _count?: { lines: number };
}

interface Warehouse { id: string; name: string; }

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "APPLIED", label: "Applied" },
  { value: "REJECTED", label: "Rejected" },
];

const REASON_LABELS: Record<string, string> = {
  CYCLE_COUNT: "Cycle Count",
  DAMAGE: "Damage",
  EXPIRY: "Expiry",
  FOUND: "Found",
  OTHER: "Other",
};

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => {
    fetch("/api/warehouses?pageSize=200")
      .then((r) => r.json())
      .then((d) => setWarehouses(d.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [debounced, warehouseFilter, statusFilter]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (warehouseFilter !== "ALL") params.set("warehouseId", warehouseFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    fetch(`/api/stock-adjustments?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setAdjustments(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load adjustments"))
      .finally(() => setLoading(false));
  }, [page, debounced, warehouseFilter, statusFilter]);

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: AdjustmentRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.reference}</code>
      ),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      cell: (row: AdjustmentRow) => (
        <span className="text-sm">{row.warehouse?.name ?? "—"}</span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      cell: (row: AdjustmentRow) => (
        <span className="text-muted-foreground text-sm">
          {REASON_LABELS[row.reason] ?? row.reason}
        </span>
      ),
    },
    {
      key: "lines",
      header: "Lines",
      cell: (row: AdjustmentRow) => <span className="text-sm">{row._count?.lines ?? 0}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: AdjustmentRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (row: AdjustmentRow) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(row.createdAt), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: AdjustmentRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/warehouse/adjustments/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Adjustments"
        description="Correct stock levels after counts or damage"
        actions={
          <PermissionGuard require="warehouse:adjustment:create">
            <Button asChild>
              <Link href="/warehouse/adjustments/new">
                <Plus className="h-4 w-4 mr-2" />
                New Adjustment
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search adjustments..."
          className="max-w-xs"
        />
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Warehouses</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={adjustments}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No adjustments found"
        emptyDescription="Create a stock adjustment to correct inventory levels."
      />
    </div>
  );
}
