"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePermission } from "@/hooks/usePermission";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { usePagedData } from "@/hooks/usePagedData";
import { useCurrency } from "@/hooks/useCurrency";

const PAGE_SIZE = 20;

export default function AccountsPage() {
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canCreate = usePermission("finance:account:create");
  const canDelete = usePermission("finance:account:deactivate");
  const currency = useCurrency();
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  const { data: accounts, total, loading, mutate } = usePagedData<any>(`/api/finance/accounts?${params}`);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/finance/accounts/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Account deleted");
      setDeleteId(null);
      mutate();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete account");
    }
  }

  const columns = [
    {
      key: "code",
      header: "Code",
      cell: (row: any) => (
        <Link href={`/finance/accounts/${row.id}`} className="font-medium hover:underline">
          {row.code}
        </Link>
      ),
    },
    { key: "name", header: "Name", cell: (row: any) => row.name },
    { key: "accountType", header: "Type", cell: (row: any) => row.accountType },
    {
      key: "currentBalance",
      header: "Balance",
      cell: (row: any) => `${currency} ${(row.currentBalance || 0).toLocaleString()}`,
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row: any) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Active" : "Inactive"}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: any) =>
        canDelete ? (
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Chart of Accounts" description="Manage your chart of accounts" />
        {canCreate && (
          <Link href="/finance/accounts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </Link>
        )}
      </div>

      <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search accounts..." />

      <DataTable
        columns={columns}
        data={accounts}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No accounts found"
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
