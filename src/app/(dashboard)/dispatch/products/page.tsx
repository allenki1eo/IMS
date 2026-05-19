"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface ProductRow {
  id: string;
  code: string;
  name: string;
  uom: string;
  unitPrice?: number | null;
  lotCount?: number;
  isActive: boolean;
}

export default function FgProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const PAGE_SIZE = 20;

  useEffect(() => { setPage(1); }, [debounced]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    fetch(`/api/dispatch/products?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoading(false));
  }, [page, debounced]);

  const columns = [
    {
      key: "code",
      header: "Code",
      cell: (row: ProductRow) => (
        <Link href={`/dispatch/products/${row.id}`} className="font-semibold hover:underline">
          {row.code}
        </Link>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (row: ProductRow) => (
        <Link href={`/dispatch/products/${row.id}`} className="hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: "uom",
      header: "UOM",
      cell: (row: ProductRow) => <span className="text-muted-foreground">{row.uom}</span>,
    },
    {
      key: "unitPrice",
      header: "Unit Price",
      cell: (row: ProductRow) => (
        <span className="text-muted-foreground">
          {row.unitPrice != null ? row.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
        </span>
      ),
    },
    {
      key: "lotCount",
      header: "Lots",
      cell: (row: ProductRow) => (
        <span className="text-muted-foreground">{row.lotCount ?? 0}</span>
      ),
    },
    {
      key: "isActive",
      header: "Active",
      cell: (row: ProductRow) => <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: ProductRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dispatch/products/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="FG Products"
        description="Manage finished goods product catalogue"
        actions={
          <PermissionGuard require="dispatch:product:create">
            <Button asChild>
              <Link href="/dispatch/products/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by code or name..."
          className="w-full sm:max-w-xs"
        />
      </div>

      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No products found"
        emptyDescription="Create your first finished goods product to get started."
      />
    </div>
  );
}
