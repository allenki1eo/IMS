"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Warehouse, Package, AlertTriangle, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";

interface SummaryStats {
  totalWarehouses: number;
  totalItems: number;
  lowStockItems: number;
  pendingGRNs: number;
}

interface StockRow {
  id: string;
  itemCode: string;
  itemName: string;
  warehouseName: string;
  quantity: number;
  reorderPoint: number;
  uomSymbol: string;
  stockPct: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  highlight,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <Card className={highlight ? "border-amber-400" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? "text-amber-500" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${highlight ? "text-amber-600" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href} className="hover:opacity-90 transition-opacity">{inner}</Link>;
  return inner;
}

export default function WarehouseOverviewPage() {
  const [stats, setStats] = useState<SummaryStats>({
    totalWarehouses: 0,
    totalItems: 0,
    lowStockItems: 0,
    pendingGRNs: 0,
  });
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [whRes, itemRes, stockRes, grnRes] = await Promise.all([
        fetch("/api/warehouses?pageSize=1"),
        fetch("/api/items?pageSize=1"),
        fetch("/api/stock/balance?lowStock=true&pageSize=1"),
        fetch("/api/grns?status=DRAFT&pageSize=1"),
      ]);
      const [whJson, itemJson, stockJson, grnJson] = await Promise.all([
        whRes.json(),
        itemRes.json(),
        stockRes.json(),
        grnRes.json(),
      ]);
      setStats({
        totalWarehouses: whJson.meta?.total ?? 0,
        totalItems: itemJson.meta?.total ?? 0,
        lowStockItems: stockJson.meta?.total ?? 0,
        pendingGRNs: grnJson.meta?.total ?? 0,
      });
    } catch {
      toast.error("Failed to load summary stats");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLowStock = useCallback(async () => {
    setStockLoading(true);
    try {
      const res = await fetch("/api/stock/balance?sort=stockPct&pageSize=10");
      const json = await res.json();
      const rows = (json.data ?? []).map((r: Record<string, unknown>) => ({
        id: String(r.id ?? r.itemId ?? Math.random()),
        itemCode: r.itemCode as string,
        itemName: r.itemName as string,
        warehouseName: r.warehouseName as string,
        quantity: Number(r.quantity ?? 0),
        reorderPoint: Number(r.reorderPoint ?? 0),
        uomSymbol: r.uomSymbol as string ?? "",
        stockPct: r.reorderPoint
          ? Math.round((Number(r.quantity) / Number(r.reorderPoint)) * 100)
          : 100,
      }));
      setStockRows(rows);
    } catch {
      toast.error("Failed to load stock data");
    } finally {
      setStockLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLowStock();
  }, [fetchStats, fetchLowStock]);

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
      key: "warehouseName",
      header: "Warehouse",
      cell: (row: StockRow) => (
        <span className="text-muted-foreground text-sm">{row.warehouseName}</span>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      cell: (row: StockRow) => (
        <span
          className={
            row.quantity <= row.reorderPoint
              ? "text-red-600 font-semibold"
              : "text-foreground"
          }
        >
          {row.quantity} {row.uomSymbol}
        </span>
      ),
    },
    {
      key: "reorderPoint",
      header: "Reorder At",
      cell: (row: StockRow) => (
        <span className="text-muted-foreground text-sm">
          {row.reorderPoint} {row.uomSymbol}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: StockRow) => {
        if (row.quantity === 0)
          return <Badge variant="destructive">Out of Stock</Badge>;
        if (row.quantity <= row.reorderPoint)
          return <Badge variant="warning">Low Stock</Badge>;
        return <Badge variant="success">OK</Badge>;
      },
    },
  ];

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Warehouse Management"
        description="Overview of stock, warehouses, and operations"
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Warehouses"
          value={stats.totalWarehouses}
          icon={Warehouse}
          href="/warehouse/warehouses"
        />
        <StatCard
          title="Total Items"
          value={stats.totalItems}
          icon={Package}
          href="/warehouse/items"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockItems}
          icon={AlertTriangle}
          href="/warehouse/stock"
          highlight={stats.lowStockItems > 0}
        />
        <StatCard
          title="Pending GRNs"
          value={stats.pendingGRNs}
          icon={ClipboardList}
          href="/warehouse/grn"
          highlight={stats.pendingGRNs > 0}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Lowest Stock Levels</h2>
        <DataTable
          columns={columns}
          data={stockRows}
          loading={stockLoading}
          emptyTitle="No stock data"
          emptyDescription="Stock balances will appear here once GRNs are confirmed."
        />
      </div>
    </div>
  );
}
