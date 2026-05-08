"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";

interface WorkflowRow {
  id: string;
  name: string;
  module: string;
  resource: string;
  status: string;
  _count?: { steps: number };
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const PAGE_SIZE = 20;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    fetch(`/api/approval-workflows?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setWorkflows(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load workflows"))
      .finally(() => setLoading(false));
  }, [page]);

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (row: WorkflowRow) => <span className="font-semibold">{row.name}</span>,
    },
    {
      key: "module",
      header: "Module",
      cell: (row: WorkflowRow) => (
        <span className="capitalize text-sm">{row.module.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "resource",
      header: "Resource",
      cell: (row: WorkflowRow) => (
        <span className="capitalize text-sm text-muted-foreground">{row.resource.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "steps",
      header: "Steps",
      cell: (row: WorkflowRow) => (
        <span className="text-sm">{row._count?.steps ?? 0}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: WorkflowRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: WorkflowRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/approvals/workflows/${row.id}`}>Edit</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Approval Workflows"
        description="Configure approval workflow rules"
        actions={
          <PermissionGuard require="approvals:workflow:create">
            <Button asChild>
              <Link href="/approvals/workflows/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={columns}
        data={workflows}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No workflows defined"
        emptyDescription="Create an approval workflow to get started."
      />
    </div>
  );
}
