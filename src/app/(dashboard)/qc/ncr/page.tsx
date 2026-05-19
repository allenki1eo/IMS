"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { usePagedData } from "@/hooks/usePagedData";

interface NcrRow {
  id: string;
  reference: string;
  title: string;
  severity: string;
  status: string;
  test?: { reference: string } | null;
  disposition?: string | null;
  createdAt: string;
}

const SEVERITY_FILTERS = [
  { label: "All Severity", value: "ALL" },
  { label: "Minor", value: "MINOR" },
  { label: "Major", value: "MAJOR" },
  { label: "Critical", value: "CRITICAL" },
];

const STATUS_FILTERS = [
  { label: "All Status", value: "ALL" },
  { label: "Open", value: "OPEN" },
  { label: "In Review", value: "IN_REVIEW" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
];

function severityBadge(severity: string) {
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-700",
    MAJOR: "bg-orange-100 text-orange-700",
    MINOR: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colors[severity] ?? "bg-gray-100 text-gray-600"}`}>
      {severity}
    </span>
  );
}

const PAGE_SIZE = 20;

export default function NcrPage() {
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (severity !== "ALL") params.set("severity", severity);
  if (status !== "ALL") params.set("status", status);
  const { data: ncrs, total, loading, mutate } = usePagedData<NcrRow>(`/api/qc/ncr?${params}`);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/qc/ncr/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("NCR deleted");
      setDeleteId(null);
      mutate();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete NCR");
    }
  }

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: NcrRow) => (
        <Link href={`/qc/ncr/${row.id}`} className="font-semibold hover:underline">
          {row.reference}
        </Link>
      ),
    },
    {
      key: "title",
      header: "Title",
      cell: (row: NcrRow) => (
        <Link href={`/qc/ncr/${row.id}`} className="hover:underline max-w-[200px] truncate block">
          {row.title}
        </Link>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row: NcrRow) => severityBadge(row.severity),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: NcrRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "test",
      header: "Linked Test",
      cell: (row: NcrRow) => (
        <span className="text-muted-foreground">{row.test?.reference ?? "—"}</span>
      ),
    },
    {
      key: "disposition",
      header: "Disposition",
      cell: (row: NcrRow) => (
        <span className="text-muted-foreground">{row.disposition ?? "—"}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Reported Date",
      cell: (row: NcrRow) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {format(new Date(row.createdAt), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: NcrRow) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/qc/ncr/${row.id}`}>View</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Non-Conformances (NCR)"
        description="Manage non-conformance reports and corrective actions"
        actions={
          <PermissionGuard require="qc:ncr:create">
            <Button asChild>
              <Link href="/qc/ncr/new">
                <Plus className="h-4 w-4 mr-2" />
                Add NCR
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by reference or title..."
          className="w-full sm:max-w-xs"
        />
        <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={ncrs}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No NCRs found"
        emptyDescription="Create your first non-conformance report to get started."
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
