"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SearchInput } from "@/components/shared/SearchInput";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface BranchRow {
  id: string;
  name: string;
  code: string;
  city: string | null;
  isMain: boolean;
  status: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
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
    fetch(`/api/branches?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setBranches(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load branches"))
      .finally(() => setLoading(false));
  }, [page, debounced]);

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (row: BranchRow) => <span className="font-semibold">{row.name}</span>,
    },
    {
      key: "code",
      header: "Code",
      cell: (row: BranchRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>
      ),
    },
    {
      key: "city",
      header: "City",
      cell: (row: BranchRow) => (
        <span className="text-muted-foreground">{row.city ?? "—"}</span>
      ),
    },
    {
      key: "isMain",
      header: "Main Branch",
      cell: (row: BranchRow) =>
        row.isMain ? (
          <Badge variant="default">Main</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: BranchRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: BranchRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/company/branches/${row.id}`}>Edit</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Manage company branch locations"
        actions={
          <PermissionGuard require="company:branch:create">
            <Button asChild>
              <Link href="/company/branches/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Branch
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search branches..."
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={branches}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No branches found"
        emptyDescription="Add your first branch location."
      />
    </div>
  );
}
