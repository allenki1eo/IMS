"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { usePagedData } from "@/hooks/usePagedData";

interface SpecRow {
  id: string;
  brand: string;
  productCode?: string | null;
  version: string;
  isActive: boolean;
  parameters: { id: string }[];
}

const PAGE_SIZE = 20;

export default function ProductSpecsPage() {
  const [page, setPage] = useState(1);
  const { data: specs, total, loading } = usePagedData<SpecRow>(
    `/api/lab/specs?page=${page}&pageSize=${PAGE_SIZE}`
  );

  const columns = [
    { key: "brand", header: "Brand", cell: (row: SpecRow) => <strong>{row.brand}</strong> },
    { key: "productCode", header: "Product Code", cell: (row: SpecRow) => row.productCode ?? "-" },
    { key: "version", header: "Version", cell: (row: SpecRow) => `v${row.version}` },
    { key: "parameters", header: "Parameters", cell: (row: SpecRow) => row.parameters.length },
    { key: "isActive", header: "Status", cell: (row: SpecRow) => <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} /> },
    {
      key: "actions", header: "",
      cell: (row: SpecRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/qc/lab/specs/${row.id}`}>View / Edit</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Packaged Product Specs"
        description="Per-brand quality specifications — OE, ALC, BU, Colour, CO2, pH, Haze, etc."
        
        actions={
          <PermissionGuard require="lab:spec:write">
            <Button asChild>
              <Link href="/qc/lab/specs/new">
                <Plus className="mr-2 h-4 w-4" /> New Spec Sheet
              </Link>
            </Button>
          </PermissionGuard>
        }
      />
      <DataTable
        columns={columns}
        data={specs}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyTitle="No product specs defined yet"
      />
    </div>
  );
}
