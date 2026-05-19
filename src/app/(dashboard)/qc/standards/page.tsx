"use client";

import { useState, useEffect } from "react";
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
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface StandardRow {
  id: string;
  code: string;
  name: string;
  item?: { name: string } | null;
  _count?: { parameters: number };
  isActive: boolean;
}

export default function QcStandardsPage() {
  const [standards, setStandards] = useState<StandardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const PAGE_SIZE = 20;

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/qc/standards/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Quality standard deleted");
      setDeleteId(null);
      setPage(1);
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete quality standard");
    }
  }

  useEffect(() => { setPage(1); }, [debounced]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    fetch(`/api/qc/standards?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setStandards(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load quality standards"))
      .finally(() => setLoading(false));
  }, [page, debounced]);

  const columns = [
    {
      key: "code",
      header: "Code",
      cell: (row: StandardRow) => (
        <Link href={`/qc/standards/${row.id}`} className="hover:underline">
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>
        </Link>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (row: StandardRow) => (
        <Link href={`/qc/standards/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: "item",
      header: "Linked Item",
      cell: (row: StandardRow) => (
        <span className="text-muted-foreground">{row.item?.name ?? "—"}</span>
      ),
    },
    {
      key: "parameters",
      header: "Parameters",
      cell: (row: StandardRow) => (
        <span className="text-muted-foreground">{row._count?.parameters ?? 0}</span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row: StandardRow) => <StatusBadge status={row.isActive} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: StandardRow) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/qc/standards/${row.id}`}>View</Link>
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
        title="Quality Standards"
        description="Manage quality standards and test parameters"
        actions={
          <PermissionGuard require="qc:standard:create">
            <Button asChild>
              <Link href="/qc/standards/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Standard
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
        data={standards}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No quality standards found"
        emptyDescription="Create your first quality standard to get started."
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
