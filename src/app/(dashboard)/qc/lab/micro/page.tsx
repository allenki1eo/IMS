"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Microscope } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { usePagedData } from "@/hooks/usePagedData";
import { format } from "date-fns";

interface MicroRow {
  id: string;
  reference: string;
  reportDate: string;
  samples: { id: string; result?: string | null; isInSpec?: boolean | null }[];
}

const PAGE_SIZE = 20;

export default function MicroReportsPage() {
  const [page, setPage] = useState(1);
  const { data: reports, total, loading } = usePagedData<MicroRow>(
    `/api/lab/micro?page=${page}&pageSize=${PAGE_SIZE}`
  );

  function getSummary(samples: MicroRow["samples"]) {
    const failed = samples.filter((s) => s.isInSpec === false).length;
    if (failed > 0) return <span className="text-red-600 font-medium">{failed} OOS</span>;
    return <span className="text-green-600">All Pass</span>;
  }

  const columns = [
    { key: "reference", header: "Reference", cell: (row: MicroRow) => <strong>{row.reference}</strong> },
    { key: "reportDate", header: "Date", cell: (row: MicroRow) => format(new Date(row.reportDate), "dd MMM yyyy") },
    { key: "samples", header: "Samples", cell: (row: MicroRow) => row.samples.length },
    { key: "result", header: "Summary", cell: (row: MicroRow) => getSummary(row.samples) },
    {
      key: "actions", header: "",
      cell: (row: MicroRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/api/lab/micro/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Micro Reports"
        description="Microbiology testing records — contamination checks across tanks"
        
        actions={
          <PermissionGuard require="lab:micro:write">
            <Button asChild>
              <Link href="/qc/lab/micro/new">
                <Plus className="mr-2 h-4 w-4" /> New Micro Report
              </Link>
            </Button>
          </PermissionGuard>
        }
      />
      <DataTable
        columns={columns}
        data={reports}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyTitle="No micro reports recorded yet"
      />
    </div>
  );
}
