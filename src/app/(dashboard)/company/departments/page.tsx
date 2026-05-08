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
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  status: string;
  branch?: { id: string; name: string } | null;
  parent?: { id: string; name: string } | null;
  head?: { id: string; fullName: string } | null;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
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
    fetch(`/api/departments?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setDepartments(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load departments"))
      .finally(() => setLoading(false));
  }, [page, debounced]);

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (row: DepartmentRow) => <span className="font-semibold">{row.name}</span>,
    },
    {
      key: "code",
      header: "Code",
      cell: (row: DepartmentRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>
      ),
    },
    {
      key: "branch",
      header: "Branch",
      cell: (row: DepartmentRow) => (
        <span className="text-muted-foreground text-sm">{row.branch?.name ?? "—"}</span>
      ),
    },
    {
      key: "parent",
      header: "Parent",
      cell: (row: DepartmentRow) => (
        <span className="text-muted-foreground text-sm">{row.parent?.name ?? "—"}</span>
      ),
    },
    {
      key: "head",
      header: "Head",
      cell: (row: DepartmentRow) => (
        <span className="text-muted-foreground text-sm">{row.head?.fullName ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: DepartmentRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: DepartmentRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/company/departments/${row.id}`}>Edit</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Manage company departments"
        actions={
          <PermissionGuard require="company:department:create">
            <Button asChild>
              <Link href="/company/departments/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search departments..."
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={departments}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No departments found"
        emptyDescription="Add your first department."
      />
    </div>
  );
}
