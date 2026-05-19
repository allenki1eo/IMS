"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MovementRow {
  id: string;
  reference: string;
  reportDate: string;
  status: string;
  totalVehicles: number;
  onTrip: number;
  present: number;
  maintenance: number;
  offsite: number;
  other: number;
  submittedAt: string | null;
}

const PAGE_SIZE = 20;

function StatusBadge({ status }: { status: string }) {
  if (status === "SUBMITTED") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Submitted</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Draft</Badge>;
}

export default function DailyMovementListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/transport/daily-movement?page=${page}&pageSize=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load daily movement reports"))
      .finally(() => setLoading(false));
  }, [page]);

  const handleNewReport = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/transport/daily-movement/today");
      const d = await res.json();
      if (d.data?.report) {
        router.push(`/transport/daily-movement/${d.data.report.id}`);
      } else {
        router.push("/transport/daily-movement/new");
      }
    } catch {
      toast.error("Failed to check today's report");
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      key: "reportDate",
      header: "Date",
      sortable: true,
      cell: (row: MovementRow) => (
        <span className="font-medium">{format(new Date(row.reportDate), "dd MMM yyyy")}</span>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      cell: (row: MovementRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.reference}</code>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: MovementRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "onTrip",
      header: "On Trip",
      cell: (row: MovementRow) => (
        <span className="text-sm font-semibold text-blue-600">{row.onTrip}</span>
      ),
    },
    {
      key: "present",
      header: "Present",
      cell: (row: MovementRow) => (
        <span className="text-sm font-semibold text-emerald-600">{row.present}</span>
      ),
    },
    {
      key: "maintenance",
      header: "Maintenance",
      cell: (row: MovementRow) => (
        <span className="text-sm font-semibold text-orange-500">{row.maintenance}</span>
      ),
    },
    {
      key: "totalVehicles",
      header: "Total Vehicles",
      cell: (row: MovementRow) => (
        <span className="text-sm text-muted-foreground">{row.totalVehicles}</span>
      ),
    },
    {
      key: "submittedAt",
      header: "Submitted At",
      cell: (row: MovementRow) => (
        <span className="text-sm text-muted-foreground">
          {row.submittedAt ? format(new Date(row.submittedAt), "dd MMM yyyy HH:mm") : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: MovementRow) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/transport/daily-movement/${row.id}`)}
        >
          <FileText className="h-3.5 w-3.5 mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Daily Truck Movement"
        description="Daily fleet status reports filed by the transport officer"
        actions={
          <PermissionGuard require="transport:daily-movement:create">
            <Button onClick={handleNewReport} disabled={creating}>
              <Plus className="h-4 w-4 mr-2" />
              {creating ? "Checking..." : "New Report"}
            </Button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        exportable
        exportFilename="daily-truck-movements"
        emptyTitle="No movement reports yet"
        emptyDescription="Create the first daily truck movement report for today."
      />
    </div>
  );
}
