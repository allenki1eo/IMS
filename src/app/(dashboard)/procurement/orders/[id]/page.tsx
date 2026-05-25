"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrintButton } from "@/components/shared/PrintButton";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, formatNumber } from "../../_components/procurement-ui";

interface PurchaseOrder {
  id: string;
  reference: string;
  status: string;
  orderDate: string;
  expectedDelivery?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  exchangeRate: number | null;
  baseCurrencyAmount: number | null;
  notes?: string | null;
  supplier: { id: string; code: string; name: string; contactPerson?: string | null; email?: string | null; phone?: string | null };
  request?: { id: string; reference: string; purpose: string; status: string } | null;
  lines: Array<{
    id: string;
    itemCode?: string | null;
    description: string;
    quantity: number;
    uom: string;
    unitCost: number;
    totalCost: number;
    receivedQty: number;
  }>;
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [receiving, setReceiving] = useState<Record<string, string>>({});

  const loadOrder = useCallback(() => {
    setLoading(true);
    fetch(`/api/procurement/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const loaded = d.data ?? null;
        setOrder(loaded);
        if (loaded) {
          const next: Record<string, string> = {};
          for (const line of loaded.lines) next[line.id] = String(line.receivedQty ?? 0);
          setReceiving(next);
        }
      })
      .catch(() => toast.error("Failed to load purchase order"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  async function handleSend() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/procurement/orders/${id}/send`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to send order"); return; }
      toast.success("Purchase order sent");
      setConfirmSend(false);
      loadOrder();
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReceive() {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/procurement/orders/${id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: order.lines.map((line) => ({
            lineId: line.id,
            receivedQty: Number(receiving[line.id] ?? 0),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to receive order"); return; }
      toast.success("Receiving updated");
      loadOrder();
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!order) return <div className="text-muted-foreground">Purchase order not found.</div>;

  const canReceive = ["SENT", "PARTIALLY_RECEIVED"].includes(order.status);

  return (
    <div>
      <PageHeader
        title={order.reference}
        description={order.supplier.name}
        actions={
          <div className="flex gap-2">
            <PrintButton className="no-print" />
            <Button variant="outline" asChild>
              <Link href="/procurement/orders"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Order Info</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><p className="text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={order.status} /></div></div>
            <div><p className="text-muted-foreground">Supplier</p><p className="mt-1"><Link href={`/procurement/suppliers/${order.supplier.id}`} className="hover:underline">{order.supplier.code} - {order.supplier.name}</Link></p></div>
            <div><p className="text-muted-foreground">Order Date</p><p className="mt-1">{formatDate(order.orderDate)}</p></div>
            <div><p className="text-muted-foreground">Expected Delivery</p><p className="mt-1">{formatDate(order.expectedDelivery)}</p></div>
            <div><p className="text-muted-foreground">Sent</p><p className="mt-1">{formatDate(order.sentAt)}</p></div>
            <div><p className="text-muted-foreground">Received</p><p className="mt-1">{formatDate(order.receivedAt)}</p></div>
            {order.request && <div className="sm:col-span-2"><p className="text-muted-foreground">Linked Request</p><p className="mt-1"><Link href={`/procurement/requests/${order.request.id}`} className="hover:underline">{order.request.reference} - {order.request.purpose}</Link></p></div>}
            {order.notes && <div className="sm:col-span-2"><p className="text-muted-foreground">Notes</p><p className="mt-1 whitespace-pre-wrap">{order.notes}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Totals</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(order.subtotal, order.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(order.taxAmount, order.currency)}</span></div>
            <div className="flex justify-between border-t pt-3 text-base font-semibold"><span>Total</span><span>{formatMoney(order.totalAmount, order.currency)}</span></div>
            {order.currency && order.currency !== "TZS" && (
              <>
                <div className="flex justify-between text-xs text-muted-foreground pt-1"><span>Exchange Rate</span><span>{order.exchangeRate != null ? order.exchangeRate.toLocaleString() : "—"}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>Base Amount (TZS)</span><span>{order.baseCurrencyAmount != null ? order.baseCurrencyAmount.toLocaleString(undefined, { style: "currency", currency: "TZS" }) : "—"}</span></div>
              </>
            )}
            <div className="space-y-2 pt-3">
              {order.status === "DRAFT" && (
                <PermissionGuard require="procurement:order:send">
                  <Button className="w-full" onClick={() => setConfirmSend(true)}>Send Order</Button>
                </PermissionGuard>
              )}
              {canReceive && (
                <PermissionGuard require="procurement:order:receive">
                  <Button className="w-full" onClick={handleReceive} disabled={actionLoading}>
                    {actionLoading && <LoadingSpinner className="mr-2" />}Update Receiving
                  </Button>
                </PermissionGuard>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Order Lines</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ordered</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Received</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit Cost</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">{line.description}</td>
                    <td className="px-4 py-3">{line.itemCode ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{line.itemCode}</code> : "-"}</td>
                    <td className="px-4 py-3">{formatNumber(line.quantity)} {line.uom}</td>
                    <td className="px-4 py-3">
                      {canReceive ? (
                        <Input
                          type="number"
                          min="0"
                          max={line.quantity}
                          step="0.01"
                          className="h-8 w-28"
                          value={receiving[line.id] ?? "0"}
                          onChange={(e) => setReceiving((prev) => ({ ...prev, [line.id]: e.target.value }))}
                          disabled={actionLoading}
                        />
                      ) : (
                        <span>{formatNumber(line.receivedQty)} {line.uom}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatMoney(line.unitCost, order.currency)}</td>
                    <td className="px-4 py-3 font-medium">{formatMoney(line.totalCost, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title="Send Purchase Order"
        description="This will mark the order as sent to the supplier."
        confirmLabel="Send"
        loading={actionLoading}
        onConfirm={handleSend}
      />
    </div>
  );
}

