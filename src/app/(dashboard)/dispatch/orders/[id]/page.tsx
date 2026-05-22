"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrintButton } from "@/components/shared/PrintButton";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DispatchLine {
  id: string;
  product?: { id: string; code: string; name: string } | null;
  lot?: { id: string; lotNumber?: string | null; product?: { id: string; code: string; name: string } | null } | null;
  description: string;
  quantity: number;
  uom: string;
  unitPrice?: number | null;
  totalPrice?: number | null;
}

interface DispatchOrder {
  id: string;
  reference: string;
  status: string;
  customerName: string;
  customerContact?: string | null;
  deliveryAddress?: string | null;
  scheduledDate?: string | null;
  vehicle?: { id: string; plateNumber: string; make?: string | null; model?: string | null } | null;
  driver?: { id: string; firstName?: string | null; lastName?: string | null; employee?: { fullName: string } | null } | null;
  notes?: string | null;
  createdAt: string;
  lines?: DispatchLine[];
}

interface LotOption {
  id: string;
  product?: { code: string; name: string } | null;
  lotNumber?: string | null;
  availableQty: number;
}

interface ProductOption {
  id: string;
  code: string;
  name: string;
}

interface LineFormData {
  lotId: string;
  productId: string;
  description: string;
  quantity: string;
  uom: string;
  unitPrice: string;
}

export default function DispatchOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<DispatchOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddLine, setShowAddLine] = useState(false);
  const [lineForm, setLineForm] = useState<LineFormData>({
    lotId: "",
    productId: "",
    description: "",
    quantity: "",
    uom: "UNIT",
    unitPrice: "",
  });
  const [addingLine, setAddingLine] = useState(false);
  const [deletingLineId, setDeletingLineId] = useState<string | null>(null);
  const [lots, setLots] = useState<LotOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`/api/dispatch/orders/${id}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.data))
      .catch(() => toast.error("Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load lots and products when add line is shown
  useEffect(() => {
    if (!showAddLine) return;
    Promise.all([
      fetch("/api/dispatch/inventory?status=AVAILABLE&pageSize=200").then((r) => r.json()),
      fetch("/api/dispatch/products?pageSize=200").then((r) => r.json()),
    ])
      .then(([lotsData, productsData]) => {
        setLots(lotsData.data ?? []);
        setProducts(productsData.data ?? []);
      })
      .catch(() => {});
  }, [showAddLine]);

  async function handleAction(action: "confirm" | "dispatch" | "deliver" | "cancel") {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/dispatch/orders/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? `Failed to ${action} order`); return; }
      const messages: Record<string, string> = {
        confirm: "Order confirmed",
        dispatch: "Order dispatched",
        deliver: "Order marked as delivered",
        cancel: "Order cancelled",
      };
      toast.success(messages[action]);
      loadData();
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  function handleLineFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setLineForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAddLine(e: React.FormEvent) {
    e.preventDefault();
    if (!lineForm.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!lineForm.quantity || parseFloat(lineForm.quantity) <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    setAddingLine(true);
    try {
      const res = await fetch(`/api/dispatch/orders/${id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId: lineForm.lotId || undefined,
          productId: lineForm.productId || undefined,
          description: lineForm.description.trim(),
          quantity: parseFloat(lineForm.quantity),
          uom: lineForm.uom.trim() || "UNIT",
          unitPrice: lineForm.unitPrice ? parseFloat(lineForm.unitPrice) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to add line"); return; }
      toast.success("Line added");
      setShowAddLine(false);
      setLineForm({ lotId: "", productId: "", description: "", quantity: "", uom: "UNIT", unitPrice: "" });
      loadData();
    } catch {
      toast.error("Network error");
    } finally {
      setAddingLine(false);
    }
  }

  async function handleDeleteLine(lineId: string) {
    setDeletingLineId(lineId);
    try {
      const res = await fetch(`/api/dispatch/orders/${id}/lines/${lineId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to delete line"); return; }
      toast.success("Line removed");
      loadData();
    } catch {
      toast.error("Network error");
    } finally {
      setDeletingLineId(null);
    }
  }

  if (loading) return <LoadingState />;
  if (!order) return <div className="text-muted-foreground">Order not found.</div>;

  const lines = order.lines ?? [];
  const totalValue = lines.reduce((sum, l) => sum + (l.totalPrice ?? 0), 0);
  const isDraft = order.status === "DRAFT";
  const isConfirmed = order.status === "CONFIRMED";
  const isDispatched = order.status === "DISPATCHED";
  const driverName = order.driver
    ? (order.driver.employee?.fullName ?? [order.driver.firstName, order.driver.lastName].filter(Boolean).join(" ")) || "Unnamed driver"
    : "";

  return (
    <div>
      <PageHeader
        title={order.reference}
        description={`Dispatch Order — ${order.customerName}`}
        actions={
          <div className="flex gap-2">
            <PrintButton className="no-print" />
            <Button variant="outline" asChild>
              <Link href="/dispatch/orders">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      {/* Header Card */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Order Info</CardTitle>
          <StatusBadge status={order.status} />
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Customer</p>
            <p className="font-medium mt-1">{order.customerName}</p>
          </div>
          {order.customerContact && (
            <div>
              <p className="text-muted-foreground">Contact</p>
              <p className="mt-1">{order.customerContact}</p>
            </div>
          )}
          {order.scheduledDate && (
            <div>
              <p className="text-muted-foreground">Scheduled Date</p>
              <p className="mt-1">{format(new Date(order.scheduledDate), "dd MMM yyyy")}</p>
            </div>
          )}
          {order.vehicle && (
            <div>
              <p className="text-muted-foreground">Vehicle</p>
              <p className="mt-1">
                {order.vehicle.plateNumber}
                {order.vehicle.make ? ` — ${order.vehicle.make}` : ""}
                {order.vehicle.model ? ` ${order.vehicle.model}` : ""}
              </p>
            </div>
          )}
          {order.driver && (
            <div>
              <p className="text-muted-foreground">Driver</p>
              <p className="mt-1">{driverName}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="mt-1">{format(new Date(order.createdAt), "dd MMM yyyy")}</p>
          </div>
          {order.deliveryAddress && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-muted-foreground">Delivery Address</p>
              <p className="mt-1">{order.deliveryAddress}</p>
            </div>
          )}
          {order.notes && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-muted-foreground">Notes</p>
              <p className="mt-1">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
          {isDraft && (
            <PermissionGuard require="dispatch:order:update">
              <Button onClick={() => handleAction("confirm")} disabled={actionLoading}>
                {actionLoading && <LoadingSpinner className="mr-2" />}
                Confirm Order
              </Button>
              <Button variant="destructive" onClick={() => handleAction("cancel")} disabled={actionLoading}>
                Cancel
              </Button>
            </PermissionGuard>
          )}
          {isConfirmed && (
            <>
              <PermissionGuard require="dispatch:order:dispatch">
                <Button onClick={() => handleAction("dispatch")} disabled={actionLoading}>
                  {actionLoading && <LoadingSpinner className="mr-2" />}
                  Dispatch
                </Button>
              </PermissionGuard>
              <PermissionGuard require="dispatch:order:update">
                <Button variant="destructive" onClick={() => handleAction("cancel")} disabled={actionLoading}>
                  Cancel
                </Button>
              </PermissionGuard>
            </>
          )}
          {isDispatched && (
            <PermissionGuard require="dispatch:order:deliver">
              <Button onClick={() => handleAction("deliver")} disabled={actionLoading}>
                {actionLoading && <LoadingSpinner className="mr-2" />}
                Mark Delivered
              </Button>
            </PermissionGuard>
          )}
      </div>

      {/* Order Lines */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Order Lines ({lines.length})</CardTitle>
          {isDraft && (
            <PermissionGuard require="dispatch:order:update">
              <Button size="sm" onClick={() => setShowAddLine((p) => !p)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </PermissionGuard>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {showAddLine && (
            <div className="p-4 border-b bg-muted/30">
              <form onSubmit={handleAddLine} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Lot (optional)</Label>
                    <Select
                      value={lineForm.lotId || "__none"}
                      onValueChange={(v) => setLineForm((p) => ({ ...p, lotId: v === "__none" ? "" : v }))}
                      disabled={addingLine}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select lot" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">No lot</SelectItem>
                        {lots.map((lot) => (
                          <SelectItem key={lot.id} value={lot.id}>
                            {lot.product ? `${lot.product.code} — ${lot.product.name}` : "Unknown"}
                            {lot.lotNumber ? ` / ${lot.lotNumber}` : ""}
                            {` (Avail: ${lot.availableQty.toLocaleString()})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Product (optional)</Label>
                    <Select
                      value={lineForm.productId || "__none"}
                      onValueChange={(v) => setLineForm((p) => ({ ...p, productId: v === "__none" ? "" : v }))}
                      disabled={addingLine}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">No product</SelectItem>
                        {products.map((prod) => (
                          <SelectItem key={prod.id} value={prod.id}>
                            {prod.code} — {prod.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="line-description">Description <span className="text-destructive">*</span></Label>
                  <Input
                    id="line-description"
                    name="description"
                    value={lineForm.description}
                    onChange={handleLineFormChange}
                    placeholder="e.g. Premium Lager 500ml x24"
                    disabled={addingLine}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="line-quantity">Quantity <span className="text-destructive">*</span></Label>
                    <Input
                      id="line-quantity"
                      name="quantity"
                      type="number"
                      min="0.001"
                      step="any"
                      value={lineForm.quantity}
                      onChange={handleLineFormChange}
                      placeholder="e.g. 100"
                      disabled={addingLine}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="line-uom">UOM</Label>
                    <Input
                      id="line-uom"
                      name="uom"
                      value={lineForm.uom}
                      onChange={handleLineFormChange}
                      placeholder="UNIT"
                      disabled={addingLine}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="line-unitPrice">Unit Price</Label>
                    <Input
                      id="line-unitPrice"
                      name="unitPrice"
                      type="number"
                      min="0"
                      step="any"
                      value={lineForm.unitPrice}
                      onChange={handleLineFormChange}
                      placeholder="e.g. 2.50"
                      disabled={addingLine}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={addingLine}>
                    {addingLine && <LoadingSpinner className="mr-2" />}
                    Add Line
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddLine(false);
                      setLineForm({ lotId: "", productId: "", description: "", quantity: "", uom: "UNIT", unitPrice: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lot</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Qty</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">UOM</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit Price</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                  {isDraft && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={isDraft ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">
                      No lines added yet
                    </td>
                  </tr>
                ) : (
                  <>
                    {lines.map((line) => (
                      <tr key={line.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          {line.product ? (
                            <Link href={`/dispatch/products/${line.product.id}`} className="hover:underline text-primary text-xs">
                              {line.product.code} — {line.product.name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {line.lot ? (
                            <Link href={`/dispatch/inventory/${line.lot.id}`} className="hover:underline text-xs">
                              {line.lot.lotNumber ?? "Lot"}
                            </Link>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">{line.description}</td>
                        <td className="px-4 py-3">{line.quantity.toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground">{line.uom}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {line.unitPrice != null
                            ? line.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {line.totalPrice != null
                            ? line.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })
                            : "—"}
                        </td>
                        {isDraft && (
                          <td className="px-4 py-3">
                            <PermissionGuard require="dispatch:order:update">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                disabled={deletingLineId === line.id}
                                onClick={() => handleDeleteLine(line.id)}
                              >
                                {deletingLineId === line.id
                                  ? <LoadingSpinner />
                                  : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </PermissionGuard>
                          </td>
                        )}
                      </tr>
                    ))}
                    {lines.length > 0 && (
                      <tr className="border-t bg-muted/20 font-medium">
                        <td colSpan={6} className="px-4 py-3 text-right text-muted-foreground">Total</td>
                        <td className="px-4 py-3">
                          {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        {isDraft && <td />}
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Totals Card */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Lines Count</p>
            <p className="text-2xl font-bold mt-1">{lines.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold mt-1">
              {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
