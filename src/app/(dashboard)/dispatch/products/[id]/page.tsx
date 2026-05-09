"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LotRow {
  id: string;
  lotNumber?: string | null;
  quantityIn: number;
  quantityOut: number;
  availableQty: number;
  bestBefore?: string | null;
  status: string;
  warehouse?: { name: string } | null;
}

interface Product {
  id: string;
  code: string;
  name: string;
  uom: string;
  unitPrice?: number | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  lots?: LotRow[];
}

export default function FgProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    code: "",
    name: "",
    uom: "",
    unitPrice: "",
    description: "",
    isActive: true,
  });

  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`/api/dispatch/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const p: Product = d.data;
        setProduct(p);
        setEditForm({
          code: p.code,
          name: p.name,
          uom: p.uom,
          unitPrice: p.unitPrice != null ? String(p.unitPrice) : "",
          description: p.description ?? "",
          isActive: p.isActive,
        });
      })
      .catch(() => toast.error("Failed to load product"))
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
      const res = await fetch(`/api/dispatch/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editForm.code.trim(),
          name: editForm.name.trim(),
          uom: editForm.uom.trim() || "UNIT",
          unitPrice: editForm.unitPrice ? parseFloat(editForm.unitPrice) : undefined,
          description: editForm.description.trim() || undefined,
          isActive: editForm.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update product"); return; }
      toast.success("Product updated");
      setEditing(false);
      loadData();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!product) return <div className="text-muted-foreground">Product not found.</div>;

  const lots = product.lots ?? [];

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`FG Product — ${product.code}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dispatch/products">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/dispatch/inventory/new?productId=${product.id}`}>
                <Plus className="h-4 w-4 mr-2" />
                Receive Stock
              </Link>
            </Button>
          </div>
        }
      />

      {/* Product Info Card */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Product Info</CardTitle>
          <div className="flex items-center gap-2">
            <StatusBadge status={product.isActive ? "ACTIVE" : "INACTIVE"} />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-code">Code <span className="text-destructive">*</span></Label>
                  <Input
                    id="edit-code"
                    name="code"
                    value={editForm.code}
                    onChange={handleEditChange}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-uom">UOM</Label>
                  <Input
                    id="edit-uom"
                    name="uom"
                    value={editForm.uom}
                    onChange={handleEditChange}
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-name">Name <span className="text-destructive">*</span></Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  disabled={saving}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-unitPrice">Unit Price</Label>
                <Input
                  id="edit-unitPrice"
                  name="unitPrice"
                  type="number"
                  min="0"
                  step="any"
                  value={editForm.unitPrice}
                  onChange={handleEditChange}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-description">Description</Label>
                <textarea
                  id="edit-description"
                  name="description"
                  value={editForm.description}
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
                <p className="text-muted-foreground">Code</p>
                <p className="font-medium mt-1">{product.code}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium mt-1">{product.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">UOM</p>
                <p className="mt-1">{product.uom}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Unit Price</p>
                <p className="mt-1">
                  {product.unitPrice != null
                    ? product.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="mt-1">{format(new Date(product.createdAt), "dd MMM yyyy")}</p>
              </div>
              {product.description && (
                <div className="col-span-2 md:col-span-3">
                  <p className="text-muted-foreground">Description</p>
                  <p className="mt-1">{product.description}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lots Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Stock Lots ({lots.length})</CardTitle>
          <Button size="sm" asChild>
            <Link href={`/dispatch/inventory/new?productId=${product.id}`}>
              <Plus className="h-4 w-4 mr-1" />
              Receive Stock
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lot Number</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Qty In</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Qty Out</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Available</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Best Before</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {lots.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No lots found for this product
                    </td>
                  </tr>
                ) : (
                  lots.map((lot) => (
                    <tr key={lot.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/dispatch/inventory/${lot.id}`} className="font-medium hover:underline">
                          {lot.lotNumber ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{lot.quantityIn.toLocaleString()}</td>
                      <td className="px-4 py-3">{lot.quantityOut.toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium">{lot.availableQty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {lot.bestBefore ? format(new Date(lot.bestBefore), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={lot.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lot.warehouse?.name ?? "—"}
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
