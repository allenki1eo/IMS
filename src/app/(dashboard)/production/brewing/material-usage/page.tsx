"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { usePagedData } from "@/hooks/usePagedData";
import { format } from "date-fns";

interface UsageRow {
  id: string;
  reference: string;
  brewDate: string;
  brand: string;
  items: { id: string }[];
  batch?: { reference: string } | null;
}

const PAGE_SIZE = 20;

export default function BrewMaterialUsagePage() {
  const [page, setPage] = useState(1);
  const { data: usages, total, loading } = usePagedData<UsageRow>(
    `/api/brewing/material-usage?page=${page}&pageSize=${PAGE_SIZE}`
  );

  const columns = [
    { key: "reference", header: "Reference", cell: (row: UsageRow) => <span className="font-semibold">{row.reference}</span> },
    { key: "brewDate", header: "Brew Date", cell: (row: UsageRow) => format(new Date(row.brewDate), "dd MMM yyyy") },
    { key: "brand", header: "Brand", cell: (row: UsageRow) => row.brand },
    { key: "items", header: "Items", cell: (row: UsageRow) => row.items.length },
    { key: "batch", header: "Batch", cell: (row: UsageRow) => row.batch?.reference ?? "-" },
    {
      key: "actions", header: "",
      cell: (row: UsageRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/api/brewing/material-usage/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brewhouse Material Usage"
        description="Ingredient records per brew — Mash Tun and Wort Kettle additions"
        
        actions={
          <PermissionGuard require="brewing:material:write">
            <Button asChild>
              <Link href="/production/brewing/material-usage/new">
                <Plus className="mr-2 h-4 w-4" /> New Record
              </Link>
            </Button>
          </PermissionGuard>
        }
      />
      <DataTable
        columns={columns}
        data={usages}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyTitle="No material usage records yet"
      />
    </div>
  );
}
