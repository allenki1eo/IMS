"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { LoadingState } from "@/components/shared/LoadingState";
import { SearchInput } from "@/components/shared/SearchInput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePermission } from "@/hooks/usePermission";

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20 });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canCreate = usePermission("finance:bank:create");

  async function fetchAccounts(page = 1) {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/bank-accounts?page=${page}&pageSize=20&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (res.ok) {
        setAccounts(json.data || []);
        setMeta(json.meta || meta);
      } else {
        toast.error(json.message || "Failed to load bank accounts");
      }
    } catch {
      toast.error("Failed to load bank accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, [search]);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/finance/bank-accounts/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Bank account deleted");
      setDeleteId(null);
      fetchAccounts(1);
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete bank account");
    }
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (row: any) => (
        <Link href={`/finance/bank-accounts/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    { key: "bankName", header: "Bank", cell: (row: any) => row.bankName },
    { key: "accountNumber", header: "Account Number", cell: (row: any) => row.accountNumber },
    { key: "accountType", header: "Type", cell: (row: any) => row.accountType },
    {
      key: "currentBalance",
      header: "Balance",
      cell: (row: any) => `$${(row.currentBalance || 0).toLocaleString()}`,
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
      cell: (row: any) => (
        <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
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

      {loading ? (
        <LoadingState text="Loading bank accounts..." />
      ) : (
        <DataTable columns={columns} data={accounts} emptyTitle="No bank accounts found" />
      )}
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
