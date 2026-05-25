"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { usePagedData } from "@/hooks/usePagedData";

interface BatchRow {
  id: string;
  batchNumber: string;
  stampType: string;
  quantity: number;
  used: number;
  receivedAt: string;
  expiresAt: string | null;
  status: string;
  notes: string | null;
}

const PAGE_SIZE = 20;

export default function StampBatchesPage() {
  const [page, setPage] = useState(1);
  const url = `/api/tra-stamps/batches?page=${page}&pageSize=${PAGE_SIZE}`;
  const { data: batches, total, loading } = usePagedData<BatchRow>(url);

  function formatDate(val: string | null | undefined) {
    if (!val) return "-";
    return new Date(val).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  const columns = [
    {
      key: "batchNumber",
      header: "Batch Number",
      cell: (row: BatchRow) => <span className="font-semibold">{row.batchNumber}</span>,
    },
    {
      key: "stampType",
      header: "Type",
      cell: (row: BatchRow) => <span>{row.stampType}</span>,
    },
    {
      key: "receivedAt",
      header: "Received Date",
      cell: (row: BatchRow) => <span className="text-muted-foreground">{formatDate(row.receivedAt)}</span>,
    },
    {
      key: "quantity",
      header: "Total Qty",
      cell: (row: BatchRow) => <span>{row.quantity.toLocaleString()}</span>,
    },
    {
      key: "used",
      header: "Used",
      cell: (row: BatchRow) => <span>{row.used.toLocaleString()}</span>,
    },
    {
      key: "balance",
      header: "Balance",
      cell: (row: BatchRow) => {
        const balance = row.quantity - row.used;
        return (
          <span className={`font-semibold ${balance > 0 ? "text-green-600" : "text-red-600"}`}>
            {balance.toLocaleString()}
          </span>
        );
      },
    },
    {
      key: "expiresAt",
      header: "Expiry",
      cell: (row: BatchRow) => <span className="text-muted-foreground">{formatDate(row.expiresAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: BatchRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      cell: (row: BatchRow) => (
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/tra-stamps/batches/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stamp Batches"
        description="TRA stamp batch inventory"
        actions={
          <PermissionGuard require="tra-stamps:stamp:create">
            <Button asChild>
              <Link href="/tra-stamps/batches/new">Receive New Batch</Link>
            </Button>
          </PermissionGuard>
        }
      />
      <DataTable
        columns={columns}
        data={batches}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No stamp batches found"
        emptyDescription="Receive a new TRA stamp batch to get started."
      />
    </div>
  );
}
