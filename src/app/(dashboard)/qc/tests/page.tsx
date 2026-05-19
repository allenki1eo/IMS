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

interface TestRow {
  id: string;
  reference: string;
  testType: string;
  item?: { name: string } | null;
  batchNumber?: string | null;
  standard?: { name: string } | null;
  status: string;
  overallResult?: string | null;
  createdAt: string;
}

const TYPE_FILTERS = [
  { label: "All Types", value: "ALL" },
  { label: "Incoming", value: "INCOMING" },
  { label: "In Process", value: "IN_PROCESS" },
  { label: "Final", value: "FINAL" },
  { label: "Periodic", value: "PERIODIC" },
];

const STATUS_FILTERS = [
  { label: "All Status", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

function testTypeBadge(type: string) {
  const colors: Record<string, string> = {
    INCOMING: "bg-blue-100 text-blue-700",
    IN_PROCESS: "bg-purple-100 text-purple-700",
    FINAL: "bg-green-100 text-green-700",
    PERIODIC: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colors[type] ?? "bg-gray-100 text-gray-600"}`}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

function resultBadge(result: string | null | undefined) {
  if (!result) return <span className="text-muted-foreground text-xs">—</span>;
  const colors: Record<string, string> = {
    PASS: "bg-green-100 text-green-700",
    FAIL: "bg-red-100 text-red-700",
    CONDITIONAL: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colors[result] ?? "bg-gray-100 text-gray-600"}`}>
      {result}
    </span>
  );
}

const PAGE_SIZE = 20;

export default function QcTestsPage() {
  const [page, setPage] = useState(1);
  const [testType, setTestType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (testType !== "ALL") params.set("testType", testType);
  if (status !== "ALL") params.set("status", status);
  const { data: tests, total, loading, mutate } = usePagedData<TestRow>(`/api/qc/tests?${params}`);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/qc/tests/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Lab test deleted");
      setDeleteId(null);
      mutate();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete lab test");
    }
  }

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: TestRow) => (
        <Link href={`/qc/tests/${row.id}`} className="font-semibold hover:underline">
          {row.reference}
        </Link>
      ),
    },
    {
      key: "testType",
      header: "Type",
      cell: (row: TestRow) => testTypeBadge(row.testType),
    },
    {
      key: "itemBatch",
      header: "Item / Batch",
      cell: (row: TestRow) => (
        <span className="text-muted-foreground">
          {row.item?.name ?? "—"}
          {row.batchNumber ? ` (${row.batchNumber})` : ""}
        </span>
      ),
    },
    {
      key: "standard",
      header: "Standard",
      cell: (row: TestRow) => (
        <span className="text-muted-foreground">{row.standard?.name ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: TestRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "overallResult",
      header: "Result",
      cell: (row: TestRow) => resultBadge(row.overallResult),
    },
    {
      key: "createdAt",
      header: "Tested At",
      cell: (row: TestRow) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {format(new Date(row.createdAt), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: TestRow) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/qc/tests/${row.id}`}>View</Link>
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
        title="Lab Tests"
        description="Manage quality control lab tests and results"
        actions={
          <PermissionGuard require="qc:test:create">
            <Button asChild>
              <Link href="/qc/tests/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Test
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by reference or batch..."
          className="w-full sm:max-w-xs"
        />
        <Select value={testType} onValueChange={(v) => { setTestType(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((f) => (
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
        data={tests}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No lab tests found"
        emptyDescription="Create your first lab test to get started."
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
