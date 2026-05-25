"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { CheckCircle, Plus, RotateCcw, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePermission } from "@/hooks/usePermission";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { usePagedData } from "@/hooks/usePagedData";

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PAGE_SIZE = 20;

export default function JournalEntriesPage() {
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [voucherType, setVoucherType] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canCreate = usePermission("finance:journal:create");
  const canPost = usePermission("finance:journal:post");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (status) params.set("status", status);
  if (voucherType) params.set("voucherType", voucherType);
  const { data: entries, total, loading, mutate } = usePagedData<any>(`/api/finance/journal-entries?${params}`);

  async function handlePost(id: string) {
    if (!window.confirm("Post this journal entry? This action cannot be undone.")) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/finance/journal-entries/${id}/post`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Journal entry posted");
        mutate();
      } else {
        toast.error(json.error || json.message || "Failed to post");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/finance/journal-entries/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Journal entry deleted");
      setDeleteId(null);
      mutate();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete journal entry");
    }
  }

  async function handleReverse(id: string) {
    if (!window.confirm("Reverse this posted entry? A counter-entry will be created.")) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/finance/journal-entries/${id}/reverse`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Entry reversed");
        mutate();
      } else {
        toast.error(json.error || json.message || "Failed to reverse");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionId(null);
    }
  }

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
    {
      key: "entryDate",
      header: "Date",
      cell: (row: any) => new Date(row.entryDate).toLocaleDateString(),
    },
    {
      key: "voucherType",
      header: "Type",
      cell: (row: any) => (
        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{row.voucherType}</span>
      ),
    },
    { key: "description", header: "Description", cell: (row: any) => row.description },
    {
      key: "totalDebit",
      header: "Debit",
      cell: (row: any) => <span className="tabular-nums">{fmt(row.totalDebit || 0)}</span>,
    },
    {
      key: "totalCredit",
      header: "Credit",
      cell: (row: any) => <span className="tabular-nums">{fmt(row.totalCredit || 0)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: any) => (
        <Badge
          variant={
            row.status === "POSTED" ? "default" : row.status === "REVERSED" ? "destructive" : "secondary"
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: any) => {
        const deleteButton = (
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.id)} className="h-7 gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        );
        if (!canPost) return deleteButton;
        const busy = actionId === row.id;
        if (row.status === "DRAFT") {
          return (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => handlePost(row.id)}
                className="h-7 gap-1 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {busy ? "Posting…" : "Post"}
              </Button>
              {deleteButton}
            </div>
          );
        }
        if (row.status === "POSTED") {
          return (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => handleReverse(row.id)}
                className="h-7 gap-1 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {busy ? "Reversing…" : "Reverse"}
              </Button>
              {deleteButton}
            </div>
          );
        }
        return deleteButton;
      },
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

      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search entries…" />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="REVERSED">Reversed</option>
        </select>
        <select
          value={voucherType}
          onChange={(e) => { setVoucherType(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
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

      <DataTable
        columns={columns}
        data={entries}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No journal entries found"
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
