"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Droplets } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { usePagedData } from "@/hooks/usePagedData";
import { format } from "date-fns";

const VESSEL_LABELS: Record<string, string> = {
  WORT_COOLER: "Wort Cooler", TRANSFER_LINE: "Transfer Line", LAUTER_TUN: "Lauter Tun",
  MASH_TUN: "Mash Tun", HOLDING_TANK: "Holding Tank", WORT_KETTLE: "Wort Kettle",
  WHIRLPOOL: "Whirlpool", FERMENTER: "Fermenter / Unitank", BBT: "Bright Beer Tank (BBT)",
  YEAST_PITCHING_LINE: "Yeast Pitching Line", HOSE_PIPE: "Hose Pipe",
};

interface CIPRow {
  id: string;
  vessel: string;
  cipDate: string;
  startTime?: string | null;
  endTime?: string | null;
  operatorSign?: string | null;
}

const PAGE_SIZE = 20;

export default function CIPRecordsPage() {
  const [page, setPage] = useState(1);
  const { data: records, total, loading } = usePagedData<CIPRow>(
    `/api/brewing/cip?page=${page}&pageSize=${PAGE_SIZE}`
  );

  const columns = [
    { key: "vessel", header: "Vessel", cell: (row: CIPRow) => VESSEL_LABELS[row.vessel] ?? row.vessel },
    { key: "cipDate", header: "CIP Date", cell: (row: CIPRow) => format(new Date(row.cipDate), "dd MMM yyyy") },
    { key: "startTime", header: "Start", cell: (row: CIPRow) => row.startTime ?? "-" },
    { key: "endTime", header: "End", cell: (row: CIPRow) => row.endTime ?? "-" },
    { key: "operatorSign", header: "Operator", cell: (row: CIPRow) => row.operatorSign ?? "-" },
    {
      key: "actions", header: "",
      cell: (row: CIPRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/api/brewing/cip/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CIP Records"
        description="Clean In Place records for all brewing vessels"
        
        actions={
          <PermissionGuard require="brewing:cip:write">
            <Button asChild>
              <Link href="/production/brewing/cip/new">
                <Plus className="mr-2 h-4 w-4" /> New CIP Record
              </Link>
            </Button>
          </PermissionGuard>
        }
      />
      <DataTable
        columns={columns}
        data={records}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyTitle="No CIP records yet"
      />
    </div>
  );
}
