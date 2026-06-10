"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { usePagedData } from "@/hooks/usePagedData";
import { format } from "date-fns";

interface SessionRow {
  id: string;
  reference: string;
  brewDate: string;
  brand: string;
  brewNumber?: string | null;
  status: string;
  batch?: { reference: string; productName: string } | null;
  activities: { id: string }[];
}

const PAGE_SIZE = 20;

export default function BrewingSessionsPage() {
  const [page, setPage] = useState(1);
  const { data: sessions, total, loading } = usePagedData<SessionRow>(
    `/api/brewing/sessions?page=${page}&pageSize=${PAGE_SIZE}`
  );

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: SessionRow) => (
        <Link href={`/production/brewing/sessions/${row.id}`} className="font-semibold hover:underline">
          {row.reference}
        </Link>
      ),
    },
    {
      key: "brewDate",
      header: "Brew Date",
      cell: (row: SessionRow) => format(new Date(row.brewDate), "dd MMM yyyy"),
    },
    { key: "brand", header: "Brand / Product", cell: (row: SessionRow) => row.brand },
    {
      key: "brewNumber",
      header: "Brew #",
      cell: (row: SessionRow) => row.brewNumber ?? "-",
    },
    {
      key: "batch",
      header: "Batch",
      cell: (row: SessionRow) => row.batch ? (
        <span className="text-muted-foreground text-xs">{row.batch.reference}</span>
      ) : "-",
    },
    {
      key: "activities",
      header: "Activities",
      cell: (row: SessionRow) => (
        <span className="text-muted-foreground">{row.activities.length}</span>
      ),
    },
    { key: "status", header: "Status", cell: (row: SessionRow) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      cell: (row: SessionRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/production/brewing/sessions/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mashing / Brewing Sessions"
        description="Brew day process records — mash conversion and lautering activities"
        
        actions={
          <PermissionGuard require="brewing:session:write">
            <Button asChild>
              <Link href="/production/brewing/sessions/new">
                <Plus className="mr-2 h-4 w-4" /> New Session
              </Link>
            </Button>
          </PermissionGuard>
        }
      />
      <DataTable
        columns={columns}
        data={sessions}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyTitle="No brewing sessions recorded yet"
      />
    </div>
  );
}
