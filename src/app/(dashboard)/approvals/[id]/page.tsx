"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Clock, User } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/utils";

interface ApprovalStep {
  id: string;
  stepNumber: number;
  name: string;
  status: string;
  approvedBy?: { id: string; fullName: string } | null;
  approvedAt?: string | null;
  comment?: string | null;
}

interface ApprovalHistory {
  id: string;
  action: string;
  comment: string | null;
  createdAt: string;
  actor?: { id: string; fullName: string } | null;
}

interface ApprovalRequest {
  id: string;
  referenceNumber: string;
  module: string;
  resource: string;
  resourceId: string;
  status: string;
  priority: string;
  description: string | null;
  createdAt: string;
  requestedBy?: { id: string; fullName: string } | null;
  steps?: ApprovalStep[];
  history?: ApprovalHistory[];
}

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [approveComment, setApproveComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [actioning, setActioning] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    fetch(`/api/approval-requests/${id}`)
      .then((r) => r.json())
      .then((d) => setRequest(d.data))
      .catch(() => toast.error("Failed to load approval request"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove() {
    setActioning("approve");
    try {
      const res = await fetch(`/api/approval-requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: approveComment || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to approve"); return; }
      toast.success("Request approved");
      setRequest((r) => r ? { ...r, status: "APPROVED" } : r);
      setApproveComment("");
    } catch {
      toast.error("Network error");
    } finally {
      setActioning(null);
    }
  }

  async function handleReject() {
    if (!rejectComment) { toast.error("A comment is required when rejecting"); return; }
    setActioning("reject");
    try {
      const res = await fetch(`/api/approval-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: rejectComment }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to reject"); return; }
      toast.success("Request rejected");
      setRequest((r) => r ? { ...r, status: "REJECTED" } : r);
      setRejectComment("");
    } catch {
      toast.error("Network error");
    } finally {
      setActioning(null);
    }
  }

  if (loading) return <LoadingState />;
  if (!request) return <div className="text-muted-foreground">Approval request not found.</div>;

  return (
    <div>
      <PageHeader
        title={request.referenceNumber}
        description={`${request.module} — ${request.resource}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/approvals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-1"><StatusBadge status={request.status} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority</span>
                  <div className="mt-1"><StatusBadge status={request.priority} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Module</span>
                  <p className="font-medium capitalize">{request.module.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Resource</span>
                  <p className="font-medium capitalize">{request.resource.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Requested By</span>
                  <p className="font-medium">{request.requestedBy?.fullName ?? "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Requested At</span>
                  <p className="font-medium">{formatDateTime(request.createdAt)}</p>
                </div>
                {request.description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Description</span>
                    <p className="mt-1">{request.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Workflow Steps */}
          {request.steps && request.steps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workflow Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {request.steps.map((step) => (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {step.status === "APPROVED" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : step.status === "REJECTED" ? (
                          <XCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Step {step.stepNumber}: {step.name}
                          </span>
                          <StatusBadge status={step.status} />
                        </div>
                        {step.approvedBy && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            By {step.approvedBy.fullName} at {formatDateTime(step.approvedAt)}
                          </p>
                        )}
                        {step.comment && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">"{step.comment}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* History timeline */}
          {request.history && request.history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {request.history.map((h, idx) => (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {idx < request.history!.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{h.actor?.fullName ?? "System"}</span>
                          <span className="text-xs text-muted-foreground capitalize">{h.action.replace(/_/g, " ")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</p>
                        {h.comment && (
                          <p className="text-sm mt-1 bg-muted px-3 py-2 rounded text-muted-foreground italic">
                            "{h.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions sidebar */}
        {request.status === "PENDING" && (
          <PermissionGuard requireAny={["approvals:request:approve", "approvals:request:reject"]}>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-green-600">Approve</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="approveComment">Comment (optional)</Label>
                    <textarea
                      id="approveComment"
                      value={approveComment}
                      onChange={(e) => setApproveComment(e.target.value)}
                      className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Add an approval note..."
                      disabled={!!actioning}
                    />
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleApprove}
                    disabled={!!actioning}
                  >
                    {actioning === "approve" && <LoadingSpinner className="mr-2" />}
                    Approve Request
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Reject</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="rejectComment">
                      Comment <span className="text-destructive">*</span>
                    </Label>
                    <textarea
                      id="rejectComment"
                      value={rejectComment}
                      onChange={(e) => setRejectComment(e.target.value)}
                      className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Reason for rejection (required)..."
                      disabled={!!actioning}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleReject}
                    disabled={!!actioning || !rejectComment}
                  >
                    {actioning === "reject" && <LoadingSpinner className="mr-2" />}
                    Reject Request
                  </Button>
                </CardContent>
              </Card>
            </div>
          </PermissionGuard>
        )}
      </div>
    </div>
  );
}
