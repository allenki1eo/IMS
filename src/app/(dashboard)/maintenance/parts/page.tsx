"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Filter } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
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

interface CategoryOption {
  id: string;
  name: string;
}

interface SparePartRow {
  id: string;
  code: string;
  name: string;
  category?: { name: string } | null;
  uom: string;
  currentStock: number;
  minStock: number;
  unitCost: number;
}

function stockStatusBadge(part: SparePartRow) {
  if (part.currentStock === 0) {
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">Out</span>;
  }
  if (part.currentStock <= part.minStock) {
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">Low</span>;
  }
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700">OK</span>;
}

export default function SparePartsPage() {
  const [parts, setParts] = useState<SparePartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryId, setCategoryId] = useState("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const PAGE_SIZE = 20;

  useEffect(() => {
    fetch("/api/maintenance/spare-part-categories?pageSize=200")
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [debounced, categoryId, lowStockOnly]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (categoryId !== "ALL") params.set("categoryId", categoryId);
    if (lowStockOnly) params.set("lowStock", "true");
    fetch(`/api/maintenance/spare-parts?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setParts(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load spare parts"))
      .finally(() => setLoading(false));
  }, [page, debounced, categoryId, lowStockOnly]);

  const columns = [
    {
      key: "code",
      header: "Code",
      cell: (row: SparePartRow) => (
        <Link href={`/maintenance/parts/${row.id}`} className="hover:underline">
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>
        </Link>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (row: SparePartRow) => (
        <Link href={`/maintenance/parts/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (row: SparePartRow) => (
        <span className="text-muted-foreground">{row.category?.name ?? "—"}</span>
      ),
    },
    {
      key: "uom",
      header: "UOM",
      cell: (row: SparePartRow) => <span className="text-muted-foreground">{row.uom}</span>,
    },
    {
      key: "currentStock",
      header: "Current Stock",
      cell: (row: SparePartRow) => (
        <span className="font-medium">{row.currentStock.toLocaleString()} {row.uom}</span>
      ),
    },
    {
      key: "minStock",
      header: "Min Stock",
      cell: (row: SparePartRow) => (
        <span className="text-muted-foreground">{row.minStock.toLocaleString()} {row.uom}</span>
      ),
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      cell: (row: SparePartRow) => (
        <span>${row.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: "stockStatus",
      header: "Status",
      cell: (row: SparePartRow) => stockStatusBadge(row),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: SparePartRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/maintenance/parts/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Spare Parts"
        description="Manage spare parts inventory and stock levels"
        actions={
          <PermissionGuard require="maintenance:part:create">
            <Button asChild>
              <Link href="/maintenance/parts/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Part
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by code or name..."
          className="max-w-sm"
        />
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={lowStockOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setLowStockOnly(!lowStockOnly)}
        >
          <Filter className="h-4 w-4 mr-1" />
          {lowStockOnly ? "Showing Low Stock" : "Low Stock Only"}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={parts}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No spare parts found"
        emptyDescription="Add your first spare part to get started."
      />
    </div>
  );
}
