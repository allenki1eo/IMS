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

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [voucherType, setVoucherType] = useState("");
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20 });
  const canCreate = usePermission("finance:journal:create");

  async function fetchEntries(page = 1) {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/journal-entries?page=${page}&pageSize=20&search=${encodeURIComponent(search)}&status=${status}&voucherType=${voucherType}`);
      const json = await res.json();
      if (res.ok) {
        setEntries(json.data || []);
        setMeta(json.meta || meta);
      } else {
        toast.error(json.message || "Failed to load journal entries");
      }
    } catch {
      toast.error("Failed to load journal entries");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEntries();
  }, [search, status, voucherType]);

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: any) => (
        <Link href={`/finance/journal-entries/${row.id}`} className="font-medium hover:underline">
          {row.reference}
        </Link>
      ),
    },
    { key: "entryDate", header: "Date", cell: (row: any) => new Date(row.entryDate).toLocaleDateString() },
    { key: "description", header: "Description", cell: (row: any) => row.description },
    {
      key: "totalDebit",
      header: "Debit",
      cell: (row: any) => `$${(row.totalDebit || 0).toLocaleString()}`,
    },
    {
      key: "totalCredit",
      header: "Credit",
      cell: (row: any) => `$${(row.totalCredit || 0).toLocaleString()}`,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: any) => (
        <Badge variant={row.status === "POSTED" ? "default" : row.status === "REVERSED" ? "destructive" : "secondary"}>
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Journal Entries" description="Manage journal entries and general ledger postings" />
        {canCreate && (
          <Link href="/finance/journal-entries/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </Link>
        )}
      </div>

      <div className="flex gap-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search entries..." />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="REVERSED">Reversed</option>
        </select>
        <select value={voucherType} onChange={(e) => setVoucherType(e.target.value)} className="border rounded px-3 py-2 text-sm">
          <option value="">All Vouchers</option>
          <option value="JOURNAL">Journal</option>
          <option value="PAYMENT">Payment</option>
          <option value="RECEIPT">Receipt</option>
          <option value="CONTRA">Contra</option>
          <option value="SALES">Sales</option>
          <option value="PURCHASE">Purchase</option>
          <option value="DEBIT_NOTE">Debit Note</option>
          <option value="CREDIT_NOTE">Credit Note</option>
        </select>
      </div>

      {loading ? (
        <LoadingState text="Loading journal entries..." />
      ) : (
        <DataTable columns={columns} data={entries} emptyTitle="No journal entries found" />
      )}
    </div>
  );
}
