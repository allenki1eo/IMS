"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
  order?: { id: string; reference: string; customerName: string } | null;
  quantity: number;
  unitPrice?: number | null;
  totalPrice?: number | null;
}

interface FgLot {
  id: string;
  product?: { id: string; code: string; name: string } | null;
  lotNumber?: string | null;
  quantityIn: number;
  quantityOut: number;
  availableQty: number;
  unitCost?: number | null;
  bestBefore?: string | null;
  warehouse?: { name: string } | null;
  status: string;
  notes?: string | null;
  receivedAt: string;
  dispatchLines?: DispatchLine[];
}

const LOT_STATUSES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RECALLED", label: "Recalled" },
];

export default function FgLotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [lot, setLot] = useState<FgLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    lotNumber: "",
    unitCost: "",
    bestBefore: "",
    notes: "",
    status: "AVAILABLE",
  });

  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`/api/dispatch/inventory/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const l: FgLot = d.data;
        setLot(l);
        setEditForm({
          lotNumber: l.lotNumber ?? "",
          unitCost: l.unitCost != null ? String(l.unitCost) : "",
          bestBefore: l.bestBefore ? l.bestBefore.split("T")[0] : "",
          notes: l.notes ?? "",
          status: l.status,
        });
      })
      .catch(() => toast.error("Failed to load lot"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/dispatch/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotNumber: editForm.lotNumber.trim() || undefined,
          unitCost: editForm.unitCost ? parseFloat(editForm.unitCost) : undefined,
          bestBefore: editForm.bestBefore || undefined,
          notes: editForm.notes.trim() || undefined,
          status: editForm.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update lot"); return; }
      toast.success("Lot updated");
      setEditing(false);
      loadData();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!lot) return <div className="text-muted-foreground">Lot not found.</div>;

  const dispatchLines = lot.dispatchLines ?? [];

  return (
    <div>
      <PageHeader
        title={lot.lotNumber ?? `Lot — ${lot.product?.name ?? "Unknown"}`}
        description={`FG Lot — ${lot.product?.code ?? ""} ${lot.product?.name ?? ""}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dispatch/inventory">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            {lot.product && (
              <Button variant="outline" asChild>
                <Link href={`/dispatch/products/${lot.product.id}`}>View Product</Link>
              </Button>
            )}
          </div>
        }
      />

      {/* Lot Info Card */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lot Info</CardTitle>
          <div className="flex items-center gap-2">
            <StatusBadge status={lot.status} />
            {!editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="edit-lotNumber">Lot Number</Label>
                <Input
                  id="edit-lotNumber"
                  name="lotNumber"
                  value={editForm.lotNumber}
                  onChange={handleEditChange}
                  disabled={saving}
                  placeholder="e.g. LOT-2026-001"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-unitCost">Unit Cost</Label>
                  <Input
                    id="edit-unitCost"
                    name="unitCost"
                    type="number"
                    min="0"
                    step="any"
                    value={editForm.unitCost}
                    onChange={handleEditChange}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-bestBefore">Best Before</Label>
                  <Input
                    id="edit-bestBefore"
                    name="bestBefore"
                    type="date"
                    value={editForm.bestBefore}
                    onChange={handleEditChange}
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-notes">Notes</Label>
                <textarea
                  id="edit-notes"
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditChange}
                  rows={3}
                  disabled={saving}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving && <LoadingSpinner className="mr-2" />}
                  Save Changes
                </Button>
                <Button variant="outline" type="button" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Product</p>
                <p className="mt-1">
                  {lot.product ? (
                    <Link href={`/dispatch/products/${lot.product.id}`} className="hover:underline text-primary">
                      {lot.product.code} — {lot.product.name}
                    </Link>
                  ) : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Lot Number</p>
                <p className="font-medium mt-1">{lot.lotNumber ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Warehouse</p>
                <p className="mt-1">{lot.warehouse?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Qty In</p>
                <p className="mt-1">{lot.quantityIn.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Qty Out</p>
                <p className="mt-1">{lot.quantityOut.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Available</p>
                <p className="font-medium mt-1">{lot.availableQty.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Unit Cost</p>
                <p className="mt-1">
                  {lot.unitCost != null
                    ? lot.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Best Before</p>
                <p className="mt-1">
                  {lot.bestBefore ? format(new Date(lot.bestBefore), "dd MMM yyyy") : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Received At</p>
                <p className="mt-1">{format(new Date(lot.receivedAt), "dd MMM yyyy")}</p>
              </div>
              {lot.notes && (
                <div className="col-span-2 md:col-span-3">
                  <p className="text-muted-foreground">Notes</p>
                  <p className="mt-1">{lot.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispatch Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dispatch Lines ({dispatchLines.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quantity</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit Price</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {dispatchLines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      This lot has not been dispatched in any orders
                    </td>
                  </tr>
                ) : (
                  dispatchLines.map((line) => (
                    <tr key={line.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        {line.order ? (
                          <Link href={`/dispatch/orders/${line.order.id}`} className="font-medium hover:underline">
                            {line.order.reference}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {line.order?.customerName ?? "—"}
                      </td>
                      <td className="px-4 py-3">{line.quantity.toLocaleString()}</td>
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
