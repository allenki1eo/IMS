"use client";

import { useState, useEffect } from "react";
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

interface PaymentRow {
  id: string;
  paymentNumber: string;
  type: string;
  partyName: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

const PAGE_SIZE = 20;

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canCreate = usePermission("finance:payment:create");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced, status]);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (status) params.set("status", status);
  const url = `/api/finance/payments?${params}`;
  const { data: payments, total, loading, mutate } = usePagedData<PaymentRow>(url);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/finance/payments/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Payment deleted");
      setDeleteId(null);
      mutate();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete payment");
    }
  }

  const columns = [
    {
      key: "paymentNumber",
      header: "Number",
      cell: (row: PaymentRow) => (
        <Link href={`/finance/payments/${row.id}`} className="font-medium hover:underline">
          {row.paymentNumber}
        </Link>
      ),
    },
    { key: "type", header: "Type", cell: (row: PaymentRow) => row.type },
    { key: "partyName", header: "Party", cell: (row: PaymentRow) => row.partyName },
    {
      key: "amount",
      header: "Amount",
      cell: (row: PaymentRow) => (row.amount || 0).toLocaleString("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 }),
    },
    { key: "paymentMethod", header: "Method", cell: (row: PaymentRow) => row.paymentMethod },
    {
      key: "status",
      header: "Status",
      cell: (row: PaymentRow) => (
        <Badge variant={row.status === "COMPLETED" ? "default" : row.status === "CANCELLED" ? "destructive" : "secondary"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: PaymentRow) => (
        <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Payments" description="Manage payments and receipts" />
        {canCreate && (
          <Link href="/finance/payments/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Payment
            </Button>
          </Link>
        )}
      </div>

      <div className="flex gap-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search payments..." />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No payments found"
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
