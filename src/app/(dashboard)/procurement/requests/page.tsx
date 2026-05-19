"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { formatDate, formatMoney, priorityClass, PRIORITIES, REQUEST_STATUSES } from "../_components/procurement-ui";

interface RequestRow {
  id: string;
  reference: string;
  purpose: string;
  priority: string;
  status: string;
  neededBy?: string | null;
  estimatedTotal: number;
  _count?: { lines: number; purchaseOrders: number };
}

const PAGE_SIZE = 20;

export default function PurchaseRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("status");
    if (fromQuery) setStatus(fromQuery);
  }, []);

  useEffect(() => { setPage(1); }, [debounced, status, priority]);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/procurement/requests/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Purchase request deleted");
      setDeleteId(null);
      setPage(1);
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete purchase request");
    }
  }

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (status !== "ALL") params.set("status", status);
    if (priority !== "ALL") params.set("priority", priority);
    fetch(`/api/procurement/requests?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRequests(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load purchase requests"))
      .finally(() => setLoading(false));
  }, [page, debounced, status, priority]);

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: RequestRow) => (
        <Link href={`/procurement/requests/${row.id}`} className="font-semibold hover:underline">{row.reference}</Link>
      ),
    },
    { key: "purpose", header: "Purpose", cell: (row: RequestRow) => <span className="block max-w-[260px] truncate">{row.purpose}</span> },
    {
      key: "priority",
      header: "Priority",
      cell: (row: RequestRow) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass(row.priority)}`}>
          {row.priority}
        </span>
      ),
    },
    { key: "status", header: "Status", cell: (row: RequestRow) => <StatusBadge status={row.status} /> },
    { key: "neededBy", header: "Needed By", cell: (row: RequestRow) => <span className="text-muted-foreground">{formatDate(row.neededBy)}</span> },
    { key: "lines", header: "Lines", cell: (row: RequestRow) => <span>{row._count?.lines ?? 0}</span> },
    { key: "total", header: "Estimated Total", cell: (row: RequestRow) => <span>{formatMoney(row.estimatedTotal)}</span> },
    {
      key: "actions",
      header: "Actions",
      cell: (row: RequestRow) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/procurement/requests/${row.id}`}>View</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Purchase Requests"
        description="Track purchase needs from draft through approval"
        actions={
          <PermissionGuard require="procurement:request:create">
            <Button asChild>
              <Link href="/procurement/requests/new"><Plus className="h-4 w-4 mr-2" />New Request</Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search requests..." className="w-full sm:max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {REQUEST_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={requests}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No purchase requests found"
        emptyDescription="Create a purchase request to start the procurement flow."
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
