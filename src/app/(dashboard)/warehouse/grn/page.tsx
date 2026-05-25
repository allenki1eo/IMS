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

interface GRNRow {
  id: string;
  reference: string;
  status: string;
  supplierName: string | null;
  supplierRef: string | null;
  createdAt: string;
  warehouse?: { name: string } | null;
  _count?: { lines: number };
}

interface Warehouse { id: string; name: string; }

const PAGE_SIZE = 20;

export default function GRNListPage() {
  const [grns, setGrns] = useState<GRNRow[]>([]);
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

    fetch(`/api/grns?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setGrns(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load GRNs"))
      .finally(() => setLoading(false));
  }, [page, debounced, warehouseFilter, statusFilter]);

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: GRNRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.reference}</code>
      ),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      cell: (row: GRNRow) => (
        <span className="text-sm">{row.warehouse?.name ?? "—"}</span>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: (row: GRNRow) => (
        <span className="text-muted-foreground text-sm">{row.supplierName ?? "—"}</span>
      ),
    },
    {
      key: "lines",
      header: "Lines",
      cell: (row: GRNRow) => (
        <span className="text-sm">{row._count?.lines ?? 0}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: GRNRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (row: GRNRow) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(row.createdAt), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: GRNRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/warehouse/grn/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Goods Received Notes"
        description="Track incoming stock deliveries"
        actions={
          <PermissionGuard require="warehouse:grn:create">
            <Button asChild>
              <Link href="/warehouse/grn/new">
                <Plus className="h-4 w-4 mr-2" />
                New GRN
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search GRNs..."
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
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={grns}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No GRNs found"
        emptyDescription="Create your first GRN to record incoming stock."
      />
    </div>
  );
}
