"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePagedData } from "@/hooks/usePagedData";
import { format } from "date-fns";

const TYPE_LABELS: Record<string, string> = {
  ISSUE_TO_PRODUCTION: "Issue to Production",
  RETURN_FROM_PRODUCTION: "Return from Production",
  RETURN_TO_SUPPLIER: "Return to Supplier",
  OTHER_ADDITION: "Other Addition",
  OTHER_DEDUCTION: "Other Deduction",
};

const TYPE_COLORS: Record<string, string> = {
  ISSUE_TO_PRODUCTION: "text-blue-600",
  RETURN_FROM_PRODUCTION: "text-green-600",
  RETURN_TO_SUPPLIER: "text-amber-600",
  OTHER_ADDITION: "text-green-600",
  OTHER_DEDUCTION: "text-red-600",
};

interface IssueRow {
  id: string;
  reference: string;
  issueType: string;
  issueDate: string;
  destination?: string | null;
  warehouse: { name: string };
  lines: { id: string }[];
}

const PAGE_SIZE = 20;

export default function StoreIssuesPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const { data: issues, total, loading } = usePagedData<IssueRow>(
    `/api/warehouse/store-issues?page=${page}&pageSize=${PAGE_SIZE}${typeFilter !== "all" ? `&issueType=${typeFilter}` : ""}`
  );

  const columns = [
    { key: "reference", header: "Reference", cell: (row: IssueRow) => <strong>{row.reference}</strong> },
    { key: "issueDate", header: "Date", cell: (row: IssueRow) => format(new Date(row.issueDate), "dd MMM yyyy") },
    {
      key: "issueType", header: "Type",
      cell: (row: IssueRow) => (
        <span className={`font-medium ${TYPE_COLORS[row.issueType] ?? ""}`}>
          {TYPE_LABELS[row.issueType] ?? row.issueType}
        </span>
      ),
    },
    { key: "warehouse", header: "Warehouse", cell: (row: IssueRow) => row.warehouse.name },
    { key: "destination", header: "Destination / Source", cell: (row: IssueRow) => row.destination ?? "-" },
    { key: "lines", header: "Items", cell: (row: IssueRow) => row.lines.length },
    {
      key: "actions", header: "",
      cell: (row: IssueRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/warehouse/store-issues/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Issues"
        description="Issue items to production, record returns, and other stock movements"
        actions={
          <PermissionGuard require="warehouse:issue:create">
            <Button asChild>
              <Link href="/warehouse/store-issues/new">
                <Plus className="mr-2 h-4 w-4" /> New Issue / Return
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex gap-3">
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={issues}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyTitle="No store issues recorded yet"
      />
    </div>
  );
}
