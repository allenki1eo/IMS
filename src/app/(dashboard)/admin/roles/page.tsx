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

interface RoleRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  _count?: { users: number; permissions: number };
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
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
    fetch(`/api/roles?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRoles(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load roles"))
      .finally(() => setLoading(false));
  }, [page, debounced]);

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (row: RoleRow) => <span className="font-semibold">{row.name}</span>,
    },
    {
      key: "code",
      header: "Code",
      cell: (row: RoleRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (row: RoleRow) => (
        <span className="text-muted-foreground text-sm">{row.description ?? "—"}</span>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      cell: (row: RoleRow) => (
        <span className="text-sm">{row._count?.permissions ?? 0}</span>
      ),
    },
    {
      key: "users",
      header: "Users",
      cell: (row: RoleRow) => (
        <span className="text-sm">{row._count?.users ?? 0}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: RoleRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: RoleRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/roles/${row.id}`}>Edit</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Manage system roles and their permissions"
        actions={
          <PermissionGuard require="roles:role:create">
            <Button asChild>
              <Link href="/admin/roles/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Role
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search roles..."
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={roles}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No roles found"
        emptyDescription="Create a role to get started."
      />
    </div>
  );
}
