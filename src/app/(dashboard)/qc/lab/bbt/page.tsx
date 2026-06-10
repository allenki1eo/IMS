"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Beaker } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { usePagedData } from "@/hooks/usePagedData";
import { format } from "date-fns";

interface BBTRow {
  id: string;
  bbtNumber: string;
  fromTankNumber?: string | null;
  brand: string;
  sampleDate: string;
  sampleTime?: string | null;
  alc?: number | null;
  pg?: number | null;
  ph?: number | null;
  haze?: number | null;
  dissolvedO2?: number | null;
  adf?: number | null;
}

const PAGE_SIZE = 25;

export default function BBTAnalysisPage() {
  const [page, setPage] = useState(1);
  const { data: analyses, total, loading } = usePagedData<BBTRow>(
    `/api/lab/bbt?page=${page}&pageSize=${PAGE_SIZE}`
  );

  const columns = [
    { key: "bbtNumber", header: "BBT No.", cell: (row: BBTRow) => <strong>{row.bbtNumber}</strong> },
    { key: "fromTankNumber", header: "Ex-UT", cell: (row: BBTRow) => row.fromTankNumber ?? "-" },
    { key: "brand", header: "Brand", cell: (row: BBTRow) => row.brand },
    { key: "sampleDate", header: "Date", cell: (row: BBTRow) => format(new Date(row.sampleDate), "dd MMM yyyy") },
    { key: "sampleTime", header: "Time", cell: (row: BBTRow) => row.sampleTime ?? "-" },
    { key: "alc", header: "ALC %V/V", cell: (row: BBTRow) => row.alc?.toFixed(2) ?? "-" },
    { key: "pg", header: "P.G.", cell: (row: BBTRow) => row.pg?.toFixed(3) ?? "-" },
    { key: "ph", header: "pH", cell: (row: BBTRow) => row.ph?.toFixed(2) ?? "-" },
    { key: "haze", header: "Haze", cell: (row: BBTRow) => row.haze?.toFixed(2) ?? "-" },
    { key: "dissolvedO2", header: "D.O.", cell: (row: BBTRow) => row.dissolvedO2?.toFixed(2) ?? "-" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="BBT Analysis Records"
        description="Bright Beer Tank — pre-packaging quality checks"
        
        actions={
          <PermissionGuard require="lab:bbt:write">
            <Button asChild>
              <Link href="/qc/lab/bbt/new">
                <Plus className="mr-2 h-4 w-4" /> New BBT Analysis
              </Link>
            </Button>
          </PermissionGuard>
        }
      />
      <DataTable
        columns={columns}
        data={analyses}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyTitle="No BBT analyses recorded yet"
      />
    </div>
  );
}
