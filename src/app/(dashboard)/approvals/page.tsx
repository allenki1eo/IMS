"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils";

interface ApprovalRequest {
  id: string;
  referenceNumber: string;
  module: string;
  resource: string;
  status: string;
  priority: string;
  createdAt: string;
  requestedBy?: { id: string; fullName: string } | null;
}

const STATUS_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const PAGE_SIZE = 20;

  useEffect(() => { setPage(1); }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    fetch(`/api/approval-requests?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRequests(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load approval requests"))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  const columns = [
    {
      key: "referenceNumber",
      header: "Reference",
      cell: (row: ApprovalRequest) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.referenceNumber}</code>
      ),
    },
    {
      key: "module",
      header: "Module",
      cell: (row: ApprovalRequest) => (
        <span className="capitalize text-sm">{row.module.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "resource",
      header: "Resource",
      cell: (row: ApprovalRequest) => (
        <span className="capitalize text-sm text-muted-foreground">{row.resource.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: ApprovalRequest) => <StatusBadge status={row.status} />,
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row: ApprovalRequest) => <StatusBadge status={row.priority} />,
    },
    {
      key: "requestedBy",
      header: "Requested By",
      cell: (row: ApprovalRequest) => (
        <span className="text-sm">{row.requestedBy?.fullName ?? "—"}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Requested At",
      cell: (row: ApprovalRequest) => (
        <span className="text-sm text-muted-foreground">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: ApprovalRequest) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/approvals/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Approval Requests"
        description="Review and action pending approvals"
        actions={
          <PermissionGuard require="approvals:workflow:read">
            <Button variant="outline" asChild>
              <Link href="/approvals/workflows">Manage Workflows</Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
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
        data={requests}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No approval requests"
        emptyDescription="No requests match the selected filter."
      />
    </div>
  );
}
