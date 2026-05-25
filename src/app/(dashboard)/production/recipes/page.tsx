"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { usePagedData } from "@/hooks/usePagedData";
import { qty } from "../_components/production-ui";

interface RecipeRow {
  id: string;
  code: string;
  name: string;
  productName: string;
  batchSize: number;
  uom: string;
  version: string;
  status: string;
  _count?: { materials: number; batches: number };
}

const PAGE_SIZE = 20;

export default function ProductionRecipesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (status !== "ALL") params.set("status", status);
  const { data: recipes, total, loading, mutate } = usePagedData<RecipeRow>(`/api/production/recipes?${params}`);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/production/recipes/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Recipe deleted");
      setDeleteId(null);
      mutate();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete recipe");
    }
  }

  const columns = [
    { key: "name", header: "Recipe", cell: (row: RecipeRow) => <Link href={`/production/recipes/${row.id}`} className="font-semibold hover:underline">{row.name}</Link> },
    { key: "code", header: "Code", cell: (row: RecipeRow) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code> },
    { key: "product", header: "Product", cell: (row: RecipeRow) => <span>{row.productName}</span> },
    { key: "batchSize", header: "Batch Size", cell: (row: RecipeRow) => <span>{qty(row.batchSize, row.uom)}</span> },
    { key: "version", header: "Version", cell: (row: RecipeRow) => <span>{row.version}</span> },
    { key: "materials", header: "Materials", cell: (row: RecipeRow) => <span>{row._count?.materials ?? 0}</span> },
    { key: "status", header: "Status", cell: (row: RecipeRow) => <StatusBadge status={row.status} /> },
    { key: "actions", header: "Actions", cell: (row: RecipeRow) => (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild><Link href={`/production/recipes/${row.id}`}>View</Link></Button>
        <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Production Recipes" description="Maintain product recipes and material requirements" actions={<PermissionGuard require="production:recipe:create"><Button asChild><Link href="/production/recipes/new"><Plus className="h-4 w-4 mr-2" />New Recipe</Link></Button></PermissionGuard>} />
      <div className="flex flex-wrap gap-2 mb-4 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search recipes..." className="w-full sm:max-w-xs" />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={recipes} loading={loading} page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} emptyTitle="No recipes found" emptyDescription="Create a recipe to standardize production batches." />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
