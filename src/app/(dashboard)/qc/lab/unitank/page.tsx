"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, TestTube } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { usePagedData } from "@/hooks/usePagedData";
import { format } from "date-fns";

interface UTRow {
  id: string;
  tankNumber: string;
  brand: string;
  stage: string;
  sampleDate: string;
  sampleTime?: string | null;
  alc?: number | null;
  oe?: number | null;
  pg?: number | null;
  ph?: number | null;
  adf?: number | null;
}

const STAGE_LABELS: Record<string, string> = {
  PITCHING: "Pitching", PRIMARY: "Primary", SECONDARY: "Secondary",
  MATURATION: "Maturation", LAGERING: "Lagering", TRANSFER_TO_BBT: "→ BBT", FINAL: "Final",
};

const PAGE_SIZE = 25;

export default function UnitankAnalysisPage() {
  const [page, setPage] = useState(1);
  const { data: analyses, total, loading } = usePagedData<UTRow>(
    `/api/lab/unitank?page=${page}&pageSize=${PAGE_SIZE}`
  );

  const columns = [
    { key: "tankNumber", header: "UT No.", cell: (row: UTRow) => <strong>{row.tankNumber}</strong> },
    { key: "brand", header: "Brand", cell: (row: UTRow) => row.brand },
    { key: "stage", header: "Stage", cell: (row: UTRow) => STAGE_LABELS[row.stage] ?? row.stage },
    { key: "sampleDate", header: "Date", cell: (row: UTRow) => format(new Date(row.sampleDate), "dd MMM yyyy") },
    { key: "sampleTime", header: "Time", cell: (row: UTRow) => row.sampleTime ?? "-" },
    { key: "alc", header: "ALC %", cell: (row: UTRow) => row.alc?.toFixed(2) ?? "-" },
    { key: "oe", header: "O.E.", cell: (row: UTRow) => row.oe?.toFixed(2) ?? "-" },
    { key: "pg", header: "P.G.", cell: (row: UTRow) => row.pg?.toFixed(3) ?? "-" },
    { key: "ph", header: "pH", cell: (row: UTRow) => row.ph?.toFixed(2) ?? "-" },
    { key: "adf", header: "ADF %", cell: (row: UTRow) => row.adf?.toFixed(1) ?? "-" },
    {
      key: "actions", header: "",
      cell: (row: UTRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/qc/lab/unitank/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unitank Analysis Records"
        description="Fermentation progress tracking — ALC, OE, PG, pH, FG, Colour, BU, ADF"
        
        actions={
          <PermissionGuard require="lab:unitank:write">
            <Button asChild>
              <Link href="/qc/lab/unitank/new">
                <Plus className="mr-2 h-4 w-4" /> New Analysis
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
        emptyTitle="No unitank analyses recorded yet"
      />
    </div>
  );
}
