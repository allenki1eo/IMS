"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, formatNumber, priorityClass } from "../../_components/procurement-ui";

interface PurchaseRequest {
  id: string;
  reference: string;
  purpose: string;
  priority: string;
  status: string;
  neededBy?: string | null;
  estimatedTotal: number;
  notes?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  lines: Array<{
    id: string;
    itemCode?: string | null;
    description: string;
    quantity: number;
    uom: string;
    estimatedUnitCost?: number | null;
    estimatedTotal?: number | null;
  }>;
  purchaseOrders: Array<{
    id: string;
    reference: string;
    status: string;
    totalAmount: number;
    currency: string;
    supplier?: { name: string } | null;
  }>;
}

export default function PurchaseRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"submit" | "approve" | "reject" | null>(null);

  const loadRequest = useCallback(() => {
    setLoading(true);
    fetch(`/api/procurement/requests/${id}`)
      .then((r) => r.json())
      .then((d) => setRequest(d.data ?? null))
      .catch(() => toast.error("Failed to load purchase request"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadRequest(); }, [loadRequest]);

  async function handleAction(action: "submit" | "approve" | "reject") {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/procurement/requests/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "reject" ? JSON.stringify({ reason: "Rejected from request detail" }) : undefined,
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? `Failed to ${action} request`); return; }
      toast.success(`Purchase request ${action === "submit" ? "submitted" : action === "approve" ? "approved" : "rejected"}`);
      setConfirmAction(null);
      loadRequest();
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!request) return <div className="text-muted-foreground">Purchase request not found.</div>;

  return (
    <div>
      <PageHeader
        title={request.reference}
        description={request.purpose}
        actions={
          <Button variant="outline" asChild>
            <Link href="/procurement/requests"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Request Info</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><p className="text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={request.status} /></div></div>
            <div>
              <p className="text-muted-foreground">Priority</p>
              <div className="mt-1"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass(request.priority)}`}>{request.priority}</span></div>
            </div>
            <div><p className="text-muted-foreground">Needed By</p><p className="mt-1">{formatDate(request.neededBy)}</p></div>
            <div><p className="text-muted-foreground">Estimated Total</p><p className="mt-1 font-semibold">{formatMoney(request.estimatedTotal)}</p></div>
            <div><p className="text-muted-foreground">Submitted</p><p className="mt-1">{formatDate(request.submittedAt)}</p></div>
            <div><p className="text-muted-foreground">Approved</p><p className="mt-1">{formatDate(request.approvedAt)}</p></div>
            {request.notes && <div className="sm:col-span-2"><p className="text-muted-foreground">Notes</p><p className="mt-1 whitespace-pre-wrap">{request.notes}</p></div>}
            {request.rejectedReason && <div className="sm:col-span-2"><p className="text-muted-foreground">Rejected Reason</p><p className="mt-1">{request.rejectedReason}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {request.status === "DRAFT" && (
              <PermissionGuard require="procurement:request:submit">
                <Button className="w-full" onClick={() => setConfirmAction("submit")}>Submit for Approval</Button>
              </PermissionGuard>
            )}
            {request.status === "SUBMITTED" && (
              <PermissionGuard require="procurement:request:approve">
                <Button className="w-full" onClick={() => setConfirmAction("approve")}>Approve Request</Button>
                <Button variant="destructive" className="w-full" onClick={() => setConfirmAction("reject")}>Reject Request</Button>
              </PermissionGuard>
            )}
            {request.status === "APPROVED" && (
              <PermissionGuard require="procurement:order:create">
                <Button className="w-full" asChild><Link href={`/procurement/orders/new?requestId=${request.id}`}>Create Purchase Order</Link></Button>
              </PermissionGuard>
            )}
            {!["DRAFT", "SUBMITTED", "APPROVED"].includes(request.status) && (
              <p className="text-sm text-muted-foreground">No actions available for this status.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Request Lines</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Qty</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit Cost</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {request.lines.map((line) => (
                  <tr key={line.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">{line.description}</td>
                    <td className="px-4 py-3">{line.itemCode ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{line.itemCode}</code> : "-"}</td>
                    <td className="px-4 py-3">{formatNumber(line.quantity)} {line.uom}</td>
                    <td className="px-4 py-3">{formatMoney(line.estimatedUnitCost)}</td>
                    <td className="px-4 py-3 font-medium">{formatMoney(line.estimatedTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Related Purchase Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Supplier</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {request.purchaseOrders.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No purchase orders created yet</td></tr>
                ) : request.purchaseOrders.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3"><Link href={`/procurement/orders/${order.id}`} className="font-medium hover:underline">{order.reference}</Link></td>
                    <td className="px-4 py-3">{order.supplier?.name ?? "-"}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3">{formatMoney(order.totalAmount, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmAction != null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={`${confirmAction === "submit" ? "Submit" : confirmAction === "approve" ? "Approve" : "Reject"} Purchase Request`}
        description="This will update the request workflow status."
        confirmLabel={confirmAction === "submit" ? "Submit" : confirmAction === "approve" ? "Approve" : "Reject"}
        variant={confirmAction === "reject" ? "destructive" : "default"}
        loading={actionLoading}
        onConfirm={() => confirmAction && handleAction(confirmAction)}
      />
    </div>
  );
}
