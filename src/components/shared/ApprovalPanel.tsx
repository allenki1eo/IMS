"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ApprovalRecord {
  id: string;
  referenceNumber: string;
  status: string;
  priority: string;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
  requestedBy?: { fullName: string };
  approvedBy?: { fullName: string };
  rejectedBy?: { fullName: string };
}

interface ApprovalPanelProps {
  module: string;
  resource: string;
  recordId: string;
  onAction?: () => void;
}

const STATUS_ICON = {
  PENDING: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  APPROVED: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  REJECTED: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  CANCELLED: <XCircle className="h-3.5 w-3.5 text-gray-400" />,
};

function fmtDate(d: string) {
  return new Date(d).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ApprovalPanel({ module, resource, recordId, onAction }: ApprovalPanelProps) {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/approval-requests?module=${module}&resource=${resource}&recordId=${recordId}&pageSize=10`)
      .then((r) => r.json())
      .then((d) => setApprovals(Array.isArray(d.data) ? d.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [module, resource, recordId]);

  const handleAction = async (approvalId: string, action: "approve" | "reject") => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/approval-requests/${approvalId}/${action}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(action === "approve" ? "Request approved" : "Request rejected");
      load();
      onAction?.();
    } catch (e: any) {
      toast.error(e.message ?? "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">No approval requests for this record.</p>
        <Link href="/approvals" className="text-xs text-primary hover:underline mt-1 inline-block">
          View all approvals
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {approvals.map((ap) => (
        <div key={ap.id} className={cn(
          "rounded-lg border p-3 space-y-2",
          ap.status === "PENDING" && "border-amber-200 bg-amber-50/50",
          ap.status === "APPROVED" && "border-emerald-200 bg-emerald-50/50",
          ap.status === "REJECTED" && "border-red-200 bg-red-50/50",
        )}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {STATUS_ICON[ap.status as keyof typeof STATUS_ICON] ?? <Clock className="h-3.5 w-3.5" />}
              <span className="text-sm font-medium">{ap.referenceNumber}</span>
              <Badge variant="outline" className="text-[10px]">{ap.priority}</Badge>
            </div>
            <Link href={`/approvals/${ap.id}`} className="text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="text-xs text-muted-foreground space-y-0.5">
            {ap.requestedBy && <p>Requested by {ap.requestedBy.fullName} · {fmtDate(ap.createdAt)}</p>}
            {ap.approvedBy && <p className="text-emerald-600">Approved by {ap.approvedBy.fullName} · {fmtDate(ap.updatedAt)}</p>}
            {ap.rejectedBy && <p className="text-red-600">Rejected · {fmtDate(ap.updatedAt)}</p>}
            {ap.comments && <p className="italic">"{ap.comments}"</p>}
          </div>

          {ap.status === "PENDING" && (
            <div className="flex gap-2 pt-1">
              <PermissionGuard require="approvals:request:approve">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={actionLoading}
                  onClick={() => handleAction(ap.id, "approve")}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  disabled={actionLoading}
                  onClick={() => handleAction(ap.id, "reject")}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </PermissionGuard>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
