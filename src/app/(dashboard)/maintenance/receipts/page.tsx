"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface ReceiptRow {
  id: string;
  createdAt: string;
  sparePart?: { code: string; name: string } | null;
  quantity: number;
  unitCost?: number | null;
  totalValue?: number | null;
  reference?: string | null;
  notes?: string | null;
  workOrder?: { reference: string } | null;
}

export default function PartsReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const PAGE_SIZE = 20;

  useEffect(() => { setPage(1); }, [debounced, dateFrom, dateTo]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    fetch(`/api/maintenance/parts-receipts?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setReceipts(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load receipts"))
      .finally(() => setLoading(false));
  }, [page, debounced, dateFrom, dateTo]);

  const columns = [
    {
      key: "createdAt",
      header: "Date",
      cell: (row: ReceiptRow) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {format(new Date(row.createdAt), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "part",
      header: "Part",
      cell: (row: ReceiptRow) => (
        <div>
          {row.sparePart ? (
            <>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded mr-1">{row.sparePart.code}</code>
              <span className="font-medium">{row.sparePart.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Quantity",
      cell: (row: ReceiptRow) => (
        <span className="font-medium text-green-600">+{row.quantity.toLocaleString()}</span>
      ),
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      cell: (row: ReceiptRow) => (
        <span>
          {row.unitCost != null
            ? `$${row.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "—"}
        </span>
      ),
    },
    {
      key: "totalValue",
      header: "Total Value",
      cell: (row: ReceiptRow) => {
        const total = row.totalValue ?? (row.unitCost != null ? row.unitCost * row.quantity : null);
        return (
          <span className="font-medium">
            {total != null
              ? `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—"}
          </span>
        );
      },
    },
    {
      key: "reference",
      header: "Reference",
      cell: (row: ReceiptRow) => (
        row.reference
          ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.reference}</code>
          : <span className="text-muted-foreground">—</span>
      ),
    },
    {
      key: "workOrder",
      header: "Work Order",
      cell: (row: ReceiptRow) => (
        <span className="text-muted-foreground text-xs">
          {row.workOrder?.reference ?? "—"}
        </span>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      cell: (row: ReceiptRow) => (
        <span className="text-muted-foreground">{row.notes ?? "—"}</span>
      ),
    },
  ];

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setSearch("");
  }

  const hasFilters = debounced || dateFrom || dateTo;

  return (
    <div>
      <PageHeader
        title="Parts Receipts"
        description="View all incoming spare parts stock transactions"
      />

      <div className="flex flex-wrap gap-2 mb-4 flex-wrap items-end">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by part or reference..."
          className="w-full sm:max-w-xs"
        />
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            className="h-9 w-[160px]"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            className="h-9 w-[160px]"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={receipts}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No receipts found"
        emptyDescription="Stock receipts are created from the spare part detail page."
      />
    </div>
  );
}
