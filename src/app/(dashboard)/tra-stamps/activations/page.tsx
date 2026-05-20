"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { usePagedData } from "@/hooks/usePagedData";

interface ActivationRow {
  id: string;
  reference: string;
  productName: string;
  quantity: number;
  activatedAt: string;
  notes: string | null;
  batch?: {
    batchNumber: string;
    stampType: string;
  } | null;
}

const PAGE_SIZE = 20;

export default function StampActivationsPage() {
  const [page, setPage] = useState(1);
  const url = `/api/tra-stamps/activations?page=${page}&pageSize=${PAGE_SIZE}`;
  const { data: activations, total, loading } = usePagedData<ActivationRow>(url);

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
      key: "reference",
      header: "Reference",
      cell: (row: ActivationRow) => <span className="font-semibold font-mono text-xs">{row.reference}</span>,
    },
    {
      key: "productName",
      header: "Product Name",
      cell: (row: ActivationRow) => <span>{row.productName}</span>,
    },
    {
      key: "batchNumber",
      header: "Batch Number",
      cell: (row: ActivationRow) => (
        <span className="text-muted-foreground">{row.batch?.batchNumber ?? "-"}</span>
      ),
    },
    {
      key: "stampType",
      header: "Type",
      cell: (row: ActivationRow) => <span>{row.batch?.stampType ?? "-"}</span>,
    },
    {
      key: "quantity",
      header: "Quantity",
      cell: (row: ActivationRow) => <span className="font-medium">{row.quantity.toLocaleString()}</span>,
    },
    {
      key: "activatedAt",
      header: "Activated At",
      cell: (row: ActivationRow) => (
        <span className="text-muted-foreground">{formatDate(row.activatedAt)}</span>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      cell: (row: ActivationRow) => (
        <span className="text-muted-foreground text-xs">{row.notes ?? "-"}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stamp Activations"
        description="Records of TRA stamps applied to products"
        actions={
          <Button asChild>
            <Link href="/tra-stamps/activations/new">Record Activation</Link>
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={activations}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No activations found"
        emptyDescription="Record a stamp activation to get started."
      />
    </div>
  );
}
