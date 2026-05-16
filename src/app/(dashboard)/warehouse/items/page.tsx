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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface ItemRow {
  id: string;
  code: string;
  name: string;
  itemType: string;
  isActive: boolean;
  minStock: number | null;
  category?: { name: string } | null;
  uom?: { symbol: string } | null;
}

interface Category { id: string; name: string; }

const ITEM_TYPES = [
  { value: "ALL", label: "All Types" },
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "FINISHED_GOOD", label: "Finished Good" },
  { value: "CONSUMABLE", label: "Consumable" },
  { value: "SPARE_PART", label: "Spare Part" },
  { value: "PACKAGING", label: "Packaging" },
];

const TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL: "Raw Material",
  FINISHED_GOOD: "Finished Good",
  CONSUMABLE: "Consumable",
  SPARE_PART: "Spare Part",
  PACKAGING: "Packaging",
};

const PAGE_SIZE = 20;

export default function ItemsPage() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => {
    fetch("/api/item-categories?pageSize=200")
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [debounced, categoryFilter, typeFilter, activeFilter]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (categoryFilter !== "ALL") params.set("categoryId", categoryFilter);
    if (typeFilter !== "ALL") params.set("itemType", typeFilter);
    if (activeFilter !== "ALL") params.set("isActive", activeFilter === "ACTIVE" ? "true" : "false");

    fetch(`/api/items?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load items"))
      .finally(() => setLoading(false));
  }, [page, debounced, categoryFilter, typeFilter, activeFilter]);

  const columns = [
    {
      key: "code",
      header: "Code",
      cell: (row: ItemRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (row: ItemRow) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "itemType",
      header: "Type",
      cell: (row: ItemRow) => (
        <Badge variant="secondary">{TYPE_LABELS[row.itemType] ?? row.itemType}</Badge>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (row: ItemRow) => (
        <span className="text-muted-foreground text-sm">{row.category?.name ?? "—"}</span>
      ),
    },
    {
      key: "uom",
      header: "UOM",
      cell: (row: ItemRow) => (
        <span className="text-sm">{row.uom?.symbol ?? "—"}</span>
      ),
    },
    {
      key: "minStock",
      header: "Min Stock",
      cell: (row: ItemRow) => (
        <span className="text-sm text-muted-foreground">
          {row.minStock != null ? row.minStock : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: ItemRow) => <StatusBadge status={row.isActive} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: ItemRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/warehouse/items/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Item Master"
        description="Manage inventory items and their details"
        actions={
          <PermissionGuard require="warehouse:item:create">
            <Button asChild>
              <Link href="/warehouse/items/new">
                <Plus className="h-4 w-4 mr-2" />
                New Item
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search items..."
          className="max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ITEM_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-full sm:w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No items found"
        emptyDescription="Add your first item to the catalog."
      />
    </div>
  );
}
