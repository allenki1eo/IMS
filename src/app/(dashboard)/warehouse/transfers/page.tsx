"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface TransferRow {
  id: string;
  reference: string;
  status: string;
  createdAt: string;
  fromWarehouse?: { name: string } | null;
  toWarehouse?: { name: string } | null;
  _count?: { lines: number };
}

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "RECEIVED", label: "Received" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced, statusFilter]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    fetch(`/api/stock-transfers?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setTransfers(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load transfers"))
      .finally(() => setLoading(false));
  }, [page, debounced, statusFilter]);

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: TransferRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.reference}</code>
      ),
    },
    {
      key: "from",
      header: "From",
      cell: (row: TransferRow) => (
        <span className="text-sm">{row.fromWarehouse?.name ?? "—"}</span>
      ),
    },
    {
      key: "to",
      header: "To",
      cell: (row: TransferRow) => (
        <span className="text-sm">{row.toWarehouse?.name ?? "—"}</span>
      ),
    },
    {
      key: "lines",
      header: "Lines",
      cell: (row: TransferRow) => <span className="text-sm">{row._count?.lines ?? 0}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: TransferRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (row: TransferRow) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(row.createdAt), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: TransferRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/warehouse/transfers/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Transfers"
        description="Move stock between warehouses"
        actions={
          <PermissionGuard require="warehouse:transfer:create">
            <Button asChild>
              <Link href="/warehouse/transfers/new">
                <Plus className="h-4 w-4 mr-2" />
                New Transfer
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search transfers..."
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={transfers}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No transfers found"
        emptyDescription="Create a stock transfer to move items between warehouses."
      />
    </div>
  );
}
