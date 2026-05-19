"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface IncidentRow {
  id: string;
  incidentType: string;
  incidentDate: string;
  location: string | null;
  status: string;
  vehicle?: { plateNumber: string } | null;
  trip?: { reference: string } | null;
}

const PAGE_SIZE = 20;

const INCIDENT_TYPE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  BREAKDOWN: "warning",
  ACCIDENT: "destructive",
  FINE: "info",
  THEFT: "destructive",
  OTHER: "secondary",
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced, typeFilter, statusFilter]);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/incidents/${deleteId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to delete incident");
      return;
    }
    toast.success("Incident deleted");
    setDeleteId(null);
    setIncidents((prev) => prev.filter((i) => i.id !== deleteId));
    setTotal((t) => t - 1);
  }

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (typeFilter !== "ALL") params.set("incidentType", typeFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    fetch(`/api/incidents?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setIncidents(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load incidents"))
      .finally(() => setLoading(false));
  }, [page, debounced, typeFilter, statusFilter]);

  const columns = [
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row: IncidentRow) => (
        <span className="font-semibold text-sm">{row.vehicle?.plateNumber ?? "—"}</span>
      ),
    },
    {
      key: "trip",
      header: "Trip",
      cell: (row: IncidentRow) => (
        row.trip ? (
          <Link href={`/transport/trips/${row.trip}`} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:underline">
            {row.trip.reference}
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )
      ),
    },
    {
      key: "incidentType",
      header: "Type",
      cell: (row: IncidentRow) => (
        <Badge variant={INCIDENT_TYPE_COLORS[row.incidentType] ?? "secondary"}>
          {row.incidentType}
        </Badge>
      ),
    },
    {
      key: "incidentDate",
      header: "Date",
      cell: (row: IncidentRow) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.incidentDate), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      cell: (row: IncidentRow) => (
        <span className="text-sm text-muted-foreground">{row.location ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: IncidentRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: IncidentRow) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/transport/incidents/${row.id}`}>View</Link>
          </Button>
          <PermissionGuard require="transport:incident:delete">
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(row.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Incidents"
        description="Track and manage fleet incidents"
        actions={
          <PermissionGuard require="transport:incident:create">
            <Button asChild>
              <Link href="/transport/incidents/new">
                <Plus className="h-4 w-4 mr-2" />
                Report Incident
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search vehicle, location..."
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="BREAKDOWN">Breakdown</SelectItem>
            <SelectItem value="ACCIDENT">Accident</SelectItem>
            <SelectItem value="FINE">Fine</SelectItem>
            <SelectItem value="THEFT">Theft</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="INVESTIGATING">Investigating</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={incidents}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No incidents found"
        emptyDescription="No incidents have been reported."
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Incident"
        description="Are you sure you want to delete this incident? This action cannot be undone."
      />
    </div>
  );
}
