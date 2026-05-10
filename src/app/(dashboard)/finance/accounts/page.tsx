"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Plus } from "lucide-react";
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
  const canCreate = usePermission("finance:account:create");

  async function fetchAccounts(page = 1) {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/accounts?page=${page}&pageSize=20&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (res.ok) {
        setAccounts(json.data || []);
        setMeta(json.meta || meta);
      } else {
        toast.error(json.message || "Failed to load accounts");
      }
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, [search]);

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
    { key: "name", header: "Name" },
    { key: "accountType", header: "Type" },
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

      <SearchInput value={search} onChange={setSearch} placeholder="Search accounts..." />

      {loading ? (
        <LoadingState message="Loading accounts..." />
      ) : (
        <DataTable
          columns={columns}
          data={accounts}
          keyExtractor={(row) => row.id}
          emptyMessage="No accounts found"
        />
      )}
    </div>
  );
}
