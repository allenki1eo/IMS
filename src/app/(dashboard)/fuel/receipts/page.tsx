"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { formatDate, formatLiters, formatMoney } from "../_components/fuel-ui";

interface ReceiptRow {
  id: string;
  reference: string;
  supplierName: string | null;
  quantityLiters: number;
  pricePerLiter: number | null;
  totalCost: number | null;
  status: string;
  createdAt: string;
  tank?: { name: string; code: string; fuelType: string } | null;
}

const PAGE_SIZE = 20;

export default function FuelReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced, status]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (status !== "ALL") params.set("status", status);

    fetch(`/api/fuel-receipts?${params}`)
      .then((res) => res.json())
      .then((json) => {
        setReceipts(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load fuel receipts"))
      .finally(() => setLoading(false));
  }, [page, debounced, status]);

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: ReceiptRow) => (
        <Link href={`/fuel/receipts/${row.id}`} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:underline">
          {row.reference}
        </Link>
      ),
    },
    {
      key: "tank",
      header: "Tank",
      cell: (row: ReceiptRow) => <span className="font-medium">{row.tank?.name ?? "-"}</span>,
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: (row: ReceiptRow) => <span className="text-sm text-muted-foreground">{row.supplierName ?? "-"}</span>,
    },
    {
      key: "quantity",
      header: "Quantity",
      cell: (row: ReceiptRow) => <span>{formatLiters(row.quantityLiters)}</span>,
    },
    {
      key: "cost",
      header: "Cost",
      cell: (row: ReceiptRow) => <span className="text-sm text-muted-foreground">{formatMoney(row.totalCost)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: ReceiptRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "created",
      header: "Created",
      cell: (row: ReceiptRow) => <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fuel Receipts"
        description="Record deliveries into fuel tanks and confirm stock updates"
        actions={
          <PermissionGuard require="fuel:receipt:create">
            <Button asChild>
              <Link href="/fuel/receipts/new">
                <Plus className="h-4 w-4 mr-2" />
                New Receipt
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search reference or supplier..." className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={receipts}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No fuel receipts found"
        emptyDescription="Record a fuel delivery to increase tank levels."
      />
    </div>
  );
}

