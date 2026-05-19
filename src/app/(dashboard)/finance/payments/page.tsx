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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20 });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canCreate = usePermission("finance:payment:create");

  async function fetchPayments(page = 1) {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/payments?page=${page}&pageSize=20&search=${encodeURIComponent(search)}&status=${status}`);
      const json = await res.json();
      if (res.ok) {
        setPayments(json.data || []);
        setMeta(json.meta || meta);
      } else {
        toast.error(json.message || "Failed to load payments");
      }
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayments();
  }, [search, status]);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/finance/payments/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Payment deleted");
      setDeleteId(null);
      fetchPayments(1);
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete payment");
    }
  }

  const columns = [
    {
      key: "paymentNumber",
      header: "Number",
      cell: (row: any) => (
        <Link href={`/finance/payments/${row.id}`} className="font-medium hover:underline">
          {row.paymentNumber}
        </Link>
      ),
    },
    { key: "type", header: "Type", cell: (row: any) => row.type },
    { key: "partyName", header: "Party", cell: (row: any) => row.partyName },
    {
      key: "amount",
      header: "Amount",
      cell: (row: any) => `$${(row.amount || 0).toLocaleString()}`,
    },
    { key: "paymentMethod", header: "Method", cell: (row: any) => row.paymentMethod },
    {
      key: "status",
      header: "Status",
      cell: (row: any) => (
        <Badge variant={row.status === "COMPLETED" ? "default" : row.status === "CANCELLED" ? "destructive" : "secondary"}>
          {row.status}
        </Badge>
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

      {loading ? (
        <LoadingState text="Loading payments..." />
      ) : (
        <DataTable columns={columns} data={payments} emptyTitle="No payments found" />
      )}
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
