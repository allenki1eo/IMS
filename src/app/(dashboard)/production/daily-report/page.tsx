"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePagedData } from "@/hooks/usePagedData";

interface BatchRow {
  id: string;
  reference: string;
  productName: string;
  plannedQty: number | null;
  actualQty: number | null;
  uom: string;
  status: string;
  completedAt: string | null;
  line?: { name: string } | null;
  recipe?: { name: string } | null;
}

function getDefaultDates() {
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    today: today.toISOString().split("T")[0],
    sevenDaysAgo: sevenDaysAgo.toISOString().split("T")[0],
  };
}

const PAGE_SIZE = 20;

export default function ProductionDailyReportPage() {
  const defaults = getDefaultDates();
  const [dateFrom, setDateFrom] = useState(defaults.sevenDaysAgo);
  const [dateTo, setDateTo] = useState(defaults.today);
  const [page, setPage] = useState(1);
  const [appliedFrom, setAppliedFrom] = useState(defaults.sevenDaysAgo);
  const [appliedTo, setAppliedTo] = useState(defaults.today);

  const url = `/api/production/daily-report?dateFrom=${appliedFrom}&dateTo=${appliedTo}&page=${page}&pageSize=${PAGE_SIZE}`;
  const { data: batches, total, loading } = usePagedData<BatchRow>(url);

  const totalQty = useMemo(() => batches.reduce((s, b) => s + (b.actualQty ?? 0), 0), [batches]);

  function handleApply() {
    setPage(1);
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
  }

  function formatDate(val: string | null | undefined) {
    if (!val) return "-";
    return new Date(val).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
  }

  const columns = [
    {
      key: "date",
      header: "Date",
      cell: (row: BatchRow) => <span className="text-muted-foreground">{formatDate(row.completedAt)}</span>,
    },
    {
      key: "reference",
      header: "Reference",
      cell: (row: BatchRow) => <span className="font-semibold">{row.reference}</span>,
    },
    {
      key: "product",
      header: "Product",
      cell: (row: BatchRow) => <span>{row.productName}</span>,
    },
    {
      key: "recipe",
      header: "Recipe",
      cell: (row: BatchRow) => <span className="text-muted-foreground">{row.recipe?.name ?? "-"}</span>,
    },
    {
      key: "plannedQty",
      header: "Planned Qty",
      cell: (row: BatchRow) => <span>{row.plannedQty != null ? `${row.plannedQty.toLocaleString()} ${row.uom}` : "-"}</span>,
    },
    {
      key: "actualQty",
      header: "Actual Qty",
      cell: (row: BatchRow) => <span className="font-medium">{row.actualQty != null ? `${row.actualQty.toLocaleString()} ${row.uom}` : "-"}</span>,
    },
    {
      key: "line",
      header: "Production Line",
      cell: (row: BatchRow) => <span className="text-muted-foreground">{row.line?.name ?? "-"}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: BatchRow) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Production Daily Report"
        description="View completed production batches by date range"
      />

      {/* Date filter */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="space-y-1">
          <Label>From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={handleApply}>Apply</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Batches Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Qty Produced (this page)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalQty.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={batches}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No completed batches found"
        emptyDescription="No production batches were completed in this date range."
      />
    </div>
  );
}
