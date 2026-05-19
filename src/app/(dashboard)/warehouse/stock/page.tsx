"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { usePagedData } from "@/hooks/usePagedData";

interface StockRow {
  id: string;
  itemCode: string;
  itemName: string;
  categoryName: string | null;
  warehouseName: string;
  locationName: string | null;
  quantity: number;
  uomSymbol: string;
  minStock: number | null;
  reorderPoint: number | null;
}

interface Warehouse { id: string; name: string; }

const PAGE_SIZE = 20;

function stockStatus(row: StockRow): "CRITICAL" | "LOW" | "OK" {
  if (row.reorderPoint != null && row.quantity <= row.reorderPoint) return "CRITICAL";
  if (row.minStock != null && row.quantity <= row.minStock) return "LOW";
  return "OK";
}

export default function StockPage() {
  const [page, setPage] = useState(1);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => {
    fetch("/api/warehouses?pageSize=200")
      .then((r) => r.json())
      .then((d) => setWarehouses(d.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [debounced, warehouseFilter, lowStockOnly]);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (warehouseFilter !== "ALL") params.set("warehouseId", warehouseFilter);
  if (lowStockOnly) params.set("lowStock", "true");
  const url = `/api/stock/balance?${params}`;
  const { data: stock, total, loading } = usePagedData<StockRow>(url);

  const columns = [
    {
      key: "itemCode",
      header: "Code",
      cell: (row: StockRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.itemCode}</code>
      ),
    },
    {
      key: "itemName",
      header: "Item",
      cell: (row: StockRow) => <span className="font-medium">{row.itemName}</span>,
    },
    {
      key: "categoryName",
      header: "Category",
      cell: (row: StockRow) => (
        <span className="text-muted-foreground text-sm">{row.categoryName ?? "—"}</span>
      ),
    },
    {
      key: "warehouseName",
      header: "Warehouse",
      cell: (row: StockRow) => (
        <span className="text-sm">{row.warehouseName}</span>
      ),
    },
    {
      key: "locationName",
      header: "Location",
      cell: (row: StockRow) => (
        <span className="text-muted-foreground text-sm">{row.locationName ?? "—"}</span>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      cell: (row: StockRow) => {
        const status = stockStatus(row);
        const colorClass =
          status === "CRITICAL"
            ? "text-red-600 font-bold"
            : status === "LOW"
            ? "text-amber-600 font-semibold"
            : "text-foreground";
        return (
          <span className={colorClass}>
            {row.quantity} {row.uomSymbol}
          </span>
        );
      },
    },
    {
      key: "minStock",
      header: "Min Stock",
      cell: (row: StockRow) => (
        <span className="text-muted-foreground text-sm">
          {row.minStock != null ? `${row.minStock} ${row.uomSymbol}` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: StockRow) => {
        const status = stockStatus(row);
        if (status === "CRITICAL") return <Badge variant="destructive">Critical</Badge>;
        if (status === "LOW") return <Badge variant="warning">Low</Badge>;
        return <Badge variant="success">OK</Badge>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Overview"
        description="Current stock levels across all warehouses"
      />

      <div className="flex flex-wrap gap-2 mb-4 flex-wrap items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search items..."
          className="max-w-xs"
        />
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Warehouses</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <input
            id="lowStockOnly"
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <Label htmlFor="lowStockOnly" className="cursor-pointer text-sm">
            Low stock only
          </Label>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={stock}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No stock found"
        emptyDescription="Stock balances will appear here after GRNs are confirmed."
      />
    </div>
  );
}
