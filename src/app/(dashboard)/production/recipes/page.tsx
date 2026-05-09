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
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced, status]);
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (status !== "ALL") params.set("status", status);
    fetch(`/api/production/recipes?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRecipes(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load recipes"))
      .finally(() => setLoading(false));
  }, [page, debounced, status]);

  const columns = [
    { key: "name", header: "Recipe", cell: (row: RecipeRow) => <Link href={`/production/recipes/${row.id}`} className="font-semibold hover:underline">{row.name}</Link> },
    { key: "code", header: "Code", cell: (row: RecipeRow) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code> },
    { key: "product", header: "Product", cell: (row: RecipeRow) => <span>{row.productName}</span> },
    { key: "batchSize", header: "Batch Size", cell: (row: RecipeRow) => <span>{qty(row.batchSize, row.uom)}</span> },
    { key: "version", header: "Version", cell: (row: RecipeRow) => <span>{row.version}</span> },
    { key: "materials", header: "Materials", cell: (row: RecipeRow) => <span>{row._count?.materials ?? 0}</span> },
    { key: "status", header: "Status", cell: (row: RecipeRow) => <StatusBadge status={row.status} /> },
    { key: "actions", header: "Actions", cell: (row: RecipeRow) => <Button variant="outline" size="sm" asChild><Link href={`/production/recipes/${row.id}`}>View</Link></Button> },
  ];

  return (
    <div>
      <PageHeader title="Production Recipes" description="Maintain product recipes and material requirements" actions={<PermissionGuard require="production:recipe:create"><Button asChild><Link href="/production/recipes/new"><Plus className="h-4 w-4 mr-2" />New Recipe</Link></Button></PermissionGuard>} />
      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search recipes..." className="max-w-sm" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={recipes} loading={loading} page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} emptyTitle="No recipes found" emptyDescription="Create a recipe to standardize production batches." />
    </div>
  );
}

