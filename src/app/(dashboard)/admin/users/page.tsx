"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SearchInput } from "@/components/shared/SearchInput";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { formatDateTime } from "@/lib/utils";

interface UserRow {
  id: string;
  fullName: string;
  username: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  roles: { id: string; name: string }[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const PAGE_SIZE = 20;

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    fetch(`/api/users?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, [page, debounced]);

  const columns = [
    {
      key: "fullName",
      header: "Full Name",
      cell: (row: UserRow) => <span className="font-semibold">{row.fullName}</span>,
    },
    {
      key: "username",
      header: "Username",
      cell: (row: UserRow) => <span className="text-muted-foreground">@{row.username}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (row: UserRow) => row.email,
    },
    {
      key: "roles",
      header: "Roles",
      cell: (row: UserRow) => (
        <div className="flex flex-wrap gap-1">
          {row.roles?.length ? (
            row.roles.map((r) => (
              <Badge key={r.id} variant="secondary" className="text-xs">
                {r.name}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-xs">No roles</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: UserRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      cell: (row: UserRow) => (
        <span className="text-sm text-muted-foreground">{formatDateTime(row.lastLoginAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: UserRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/users/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage system user accounts"
        actions={
          <PermissionGuard require="users:user:create">
            <Button asChild>
              <Link href="/admin/users/new">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, username or email..."
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No users found"
        emptyDescription="No user accounts match your search."
      />
    </div>
  );
}
