"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, SendHorizonal } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrderLine {
  id: string;
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactPerson?: string | null;
}

interface SalesOrder {
  id: string;
  reference: string;
  status: string;
  priority: string;
  orderDate: string;
  requiredDate?: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string | null;
  dispatchRef?: string | null;
  syncedAt: string;
  createdAt: string;
  customer: Customer;
  lines: OrderLine[];
}

function formatMoney(amount: number, currency = "TZS") {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadOrder = useCallback(() => {
    setLoading(true);
    fetch(`/api/sales/orders/${id}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.data))
      .catch(() => toast.error("Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  async function handleStatusChange(newStatus: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sales/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update status"); return; }
      toast.success(`Order ${newStatus.toLowerCase()}`);
      loadOrder();
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!order) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Order not found.</p>
      <Button variant="outline" asChild className="mt-4">
        <Link href="/sales/orders">Back to Orders</Link>
      </Button>
    </div>
  );

  const nextStatuses = VALID_TRANSITIONS[order.status] ?? [];

  return (
    <div>
      <PageHeader
        title={order.reference}
        description={`Sales Order · ${order.customer.name}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <Button variant="outline" size="sm" asChild>
              <Link href="/sales/orders">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Order Info */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-medium">{order.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Priority</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                order.priority === "URGENT" ? "bg-red-100 text-red-700"
                : order.priority === "HIGH" ? "bg-orange-100 text-orange-700"
                : "bg-muted text-muted-foreground"
              }`}>
                {order.priority}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Date</span>
              <span>{format(new Date(order.orderDate), "dd MMM yyyy")}</span>
            </div>
            {order.requiredDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required By</span>
                <span>{format(new Date(order.requiredDate), "dd MMM yyyy")}</span>
              </div>
            )}
            {order.dispatchRef && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dispatch Ref</span>
                <span className="font-medium text-primary">{order.dispatchRef}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <Link href={`/sales/customers/${order.customer.id}`} className="font-medium hover:underline text-primary">
                {order.customer.name}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Code</span>
              <span>{order.customer.code}</span>
            </div>
            {order.customer.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{order.customer.email}</span>
              </div>
            )}
            {order.customer.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{order.customer.phone}</span>
              </div>
            )}
            {order.customer.contactPerson && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact</span>
                <span>{order.customer.contactPerson}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Totals</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(order.subtotal, order.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatMoney(order.taxAmount, order.currency)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">{formatMoney(order.totalAmount, order.currency)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <PermissionGuard require="sales:order:update">
        {nextStatuses.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {nextStatuses.map((s) => (
              <Button
                key={s}
                variant={s === "CANCELLED" ? "destructive" : "default"}
                size="sm"
                onClick={() => handleStatusChange(s)}
                disabled={actionLoading}
              >
                {s === "CONFIRMED" ? "Confirm Order"
                  : s === "PROCESSING" ? "Mark Processing"
                  : s === "DISPATCHED" ? "Mark Dispatched"
                  : s === "DELIVERED" ? "Mark Delivered"
                  : "Cancel Order"}
              </Button>
            ))}
          </div>
        )}
      </PermissionGuard>

      {/* Create Dispatch Link */}
      {(order.status === "CONFIRMED" || order.status === "PROCESSING") && (
        <div className="mb-6">
          <Button variant="outline" asChild>
            <Link href={`/dispatch/orders/new?salesOrderId=${order.id}&ref=${encodeURIComponent(order.reference)}`}>
              <SendHorizonal className="h-4 w-4 mr-2" />
              Create Dispatch Order
            </Link>
          </Button>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Order Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Lines ({order.lines.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product Code</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Unit Price</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Discount</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No order lines
                    </td>
                  </tr>
                ) : (
                  order.lines.map((line) => (
                    <tr key={line.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{line.productCode}</td>
                      <td className="px-4 py-3">{line.description}</td>
                      <td className="px-4 py-3 text-right">{line.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(line.unitPrice, order.currency)}</td>
                      <td className="px-4 py-3 text-right">{line.discount > 0 ? formatMoney(line.discount, order.currency) : "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(line.totalPrice, order.currency)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={line.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
