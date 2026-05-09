"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "../../_components/procurement-ui";

interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  paymentTerms?: string | null;
  status: string;
  purchaseOrders?: Array<{
    id: string;
    reference: string;
    status: string;
    totalAmount: number;
    currency: string;
    createdAt: string;
    _count?: { lines: number };
  }>;
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadSupplier = useCallback(() => {
    setLoading(true);
    fetch(`/api/procurement/suppliers/${id}`)
      .then((r) => r.json())
      .then((d) => setSupplier(d.data ?? null))
      .catch(() => toast.error("Failed to load supplier"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadSupplier(); }, [loadSupplier]);

  async function toggleStatus() {
    if (!supplier) return;
    setActionLoading(true);
    const nextStatus = supplier.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/procurement/suppliers/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update supplier"); return; }
      setSupplier((prev) => prev ? { ...prev, status: json.data.status } : prev);
      toast.success(`Supplier marked ${nextStatus.toLowerCase()}`);
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!supplier) return <div className="text-muted-foreground">Supplier not found.</div>;

  return (
    <div>
      <PageHeader
        title={supplier.name}
        description={supplier.code}
        actions={
          <Button variant="outline" asChild>
            <Link href="/procurement/suppliers"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Supplier Info</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><p className="text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={supplier.status} /></div></div>
            <div><p className="text-muted-foreground">Contact Person</p><p className="mt-1">{supplier.contactPerson ?? "-"}</p></div>
            <div><p className="text-muted-foreground">Email</p><p className="mt-1">{supplier.email ?? "-"}</p></div>
            <div><p className="text-muted-foreground">Phone</p><p className="mt-1">{supplier.phone ?? "-"}</p></div>
            <div><p className="text-muted-foreground">Tax Number</p><p className="mt-1">{supplier.taxNumber ?? "-"}</p></div>
            <div><p className="text-muted-foreground">Payment Terms</p><p className="mt-1">{supplier.paymentTerms ?? "-"}</p></div>
            <div className="sm:col-span-2"><p className="text-muted-foreground">Address</p><p className="mt-1 whitespace-pre-wrap">{supplier.address ?? "-"}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <PermissionGuard require="procurement:supplier:update">
              <Button variant={supplier.status === "ACTIVE" ? "outline" : "default"} className="w-full" onClick={toggleStatus} disabled={actionLoading}>
                {actionLoading && <LoadingSpinner className="mr-2" />}
                Mark {supplier.status === "ACTIVE" ? "Inactive" : "Active"}
              </Button>
            </PermissionGuard>
            <PermissionGuard require="procurement:order:create">
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/procurement/orders/new?supplierId=${supplier.id}`}>Create Purchase Order</Link>
              </Button>
            </PermissionGuard>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Purchase Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lines</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {!supplier.purchaseOrders?.length ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No purchase orders for this supplier</td></tr>
                ) : supplier.purchaseOrders.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3"><Link href={`/procurement/orders/${order.id}`} className="font-medium hover:underline">{order.reference}</Link></td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3">{order._count?.lines ?? 0}</td>
                    <td className="px-4 py-3">{formatMoney(order.totalAmount, order.currency)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

