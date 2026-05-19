"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Filter, Upload, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { ImportModal } from "@/components/shared/ImportModal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePagedData } from "@/hooks/usePagedData";

interface CategoryOption {
  id: string;
  name: string;
}

interface SparePartRow {
  id: string;
  companyId: string;
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
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryId, setCategoryId] = useState("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();
  const { user } = useCurrentUser();
  const companyMap = Object.fromEntries((user?.companies ?? []).map((c) => [c.id, c.name]));

  const PAGE_SIZE = 20;

  useEffect(() => {
    fetch("/api/maintenance/spare-part-categories?pageSize=200")
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [debounced, categoryId, lowStockOnly]);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (categoryId !== "ALL") params.set("categoryId", categoryId);
  if (lowStockOnly) params.set("lowStock", "true");
  const url = `/api/maintenance/spare-parts?${params}`;

  const { data: parts, total, loading, mutate } = usePagedData<SparePartRow>(url);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/maintenance/spare-parts/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Spare part deleted");
      setDeleteId(null);
      mutate();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete spare part");
    }
  }

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
      key: "companyId",
      header: "Company",
      cell: (row: SparePartRow) => (
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium truncate max-w-[120px] block">
          {companyMap[row.companyId] ?? "—"}
        </span>
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/maintenance/parts/${row.id}`}>View</Link>
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
        title="Spare Parts"
        description="Manage spare parts inventory and stock levels"
        actions={
          <PermissionGuard require="maintenance:part:create">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button asChild>
                <Link href="/maintenance/parts/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Part
                </Link>
              </Button>
            </div>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4 flex-wrap items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by code or name..."
          className="w-full sm:max-w-xs"
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

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false);
          mutate();
        }}
        title="Import Spare Parts"
        apiEndpoint="/api/maintenance/spare-parts/import"
        templateHeaders={["partNumber", "name", "description", "categoryId", "uomId", "reorderPoint", "unitCost"]}
        templateFilename="spare-parts-import-template"
        instructions={[
          "name is required",
          "partNumber is optional but recommended",
          "categoryId is optional (use database ID)",
          "reorderPoint and unitCost are optional numbers",
          "uomId defaults to PCS if not provided",
        ]}
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
