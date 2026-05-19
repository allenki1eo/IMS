"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20 });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canCreate = usePermission("finance:account:create");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAccounts = useCallback(async (page = 1, q = search) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/accounts?page=${page}&pageSize=20&search=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (res.ok) {
        setAccounts(json.data || []);
        setMeta(json.meta || { total: 0, page, pageSize: 20 });
      } else {
        toast.error(json.message || "Failed to load accounts");
      }
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    fetchAccounts(1, "");
  }, [fetchAccounts]);

  // Debounced search — 300 ms delay
  function handleSearch(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchAccounts(1, value), 300);
  }

  useEffect(() => {
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, []);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/finance/accounts/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Account deleted");
      setDeleteId(null);
      fetchAccounts(1, search);
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

      <SearchInput value={search} onChange={handleSearch} placeholder="Search accounts..." />

      {loading ? (
        <LoadingState text="Loading accounts..." />
      ) : (
        <DataTable
          columns={columns}
          data={accounts}
          emptyTitle="No accounts found"
        />
      )}
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
