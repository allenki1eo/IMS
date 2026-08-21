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

interface BankAccountRow {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  currentBalance: number;
  isActive: boolean;
}

const PAGE_SIZE = 20;

export default function BankAccountsPage() {
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canCreate = usePermission("finance:bank:create");
  const canDelete = usePermission("finance:bank:deactivate");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  const url = `/api/finance/bank-accounts?${params}`;
  const { data: accounts, total, loading, mutate } = usePagedData<BankAccountRow>(url);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/finance/bank-accounts/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Bank account deleted");
      setDeleteId(null);
      mutate();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete bank account");
    }
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (row: BankAccountRow) => (
        <Link href={`/finance/bank-accounts/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    { key: "bankName", header: "Bank", cell: (row: BankAccountRow) => row.bankName },
    { key: "accountNumber", header: "Account Number", cell: (row: BankAccountRow) => row.accountNumber },
    { key: "accountType", header: "Type", cell: (row: BankAccountRow) => row.accountType },
    {
      key: "currentBalance",
      header: "Balance",
      cell: (row: BankAccountRow) => (row.currentBalance || 0).toLocaleString("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 }),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row: BankAccountRow) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Active" : "Inactive"}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: BankAccountRow) =>
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
        <PageHeader title="Bank Accounts" description="Manage bank accounts and cash books" />
        {canCreate && (
          <Link href="/finance/bank-accounts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </Link>
        )}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search bank accounts..." />

      <DataTable
        columns={columns}
        data={accounts}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No bank accounts found"
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
