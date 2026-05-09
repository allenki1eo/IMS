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
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface WarehouseRow {
  id: string;
  name: string;
  code: string;
  status: string;
  branch?: { name: string } | null;
  _count?: { locations: number };
}

const PAGE_SIZE = 20;

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    fetch(`/api/warehouses?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setWarehouses(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load warehouses"))
      .finally(() => setLoading(false));
  }, [page, debounced]);

  const columns = [
    {
      key: "code",
      header: "Code",
      cell: (row: WarehouseRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (row: WarehouseRow) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "branch",
      header: "Branch",
      cell: (row: WarehouseRow) => (
        <span className="text-muted-foreground text-sm">{row.branch?.name ?? "—"}</span>
      ),
    },
    {
      key: "locations",
      header: "Locations",
      cell: (row: WarehouseRow) => (
        <span className="text-sm">{row._count?.locations ?? 0}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: WarehouseRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: WarehouseRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/warehouse/warehouses/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Warehouses"
        description="Manage warehouse locations and storage areas"
        actions={
          <PermissionGuard require="warehouse:warehouse:create">
            <Button asChild>
              <Link href="/warehouse/warehouses/new">
                <Plus className="h-4 w-4 mr-2" />
                New Warehouse
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search warehouses..."
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={warehouses}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No warehouses found"
        emptyDescription="Create your first warehouse to get started."
      />
    </div>
  );
}
