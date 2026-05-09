"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingState";
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

interface ProductOption {
  id: string;
  code: string;
  name: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  code?: string;
}

interface FormData {
  productId: string;
  lotNumber: string;
  quantityIn: string;
  unitCost: string;
  bestBefore: string;
  warehouseId: string;
  notes: string;
}

export default function NewFgLotPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillProductId = searchParams.get("productId") ?? "";

  const [form, setForm] = useState<FormData>({
    productId: prefillProductId,
    lotNumber: "",
    quantityIn: "",
    unitCost: "",
    bestBefore: "",
    warehouseId: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/dispatch/products?pageSize=200").then((r) => r.json()),
      fetch("/api/warehouses?pageSize=200").then((r) => r.json()),
    ])
      .then(([prodData, whData]) => {
        setProducts(prodData.data ?? []);
        setWarehouses(whData.data ?? []);
      })
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productId) {
      toast.error("Product is required");
      return;
    }
    if (!form.quantityIn || parseFloat(form.quantityIn) <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/dispatch/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          lotNumber: form.lotNumber.trim() || undefined,
          quantityIn: parseFloat(form.quantityIn),
          unitCost: form.unitCost ? parseFloat(form.unitCost) : undefined,
          bestBefore: form.bestBefore || undefined,
          warehouseId: form.warehouseId || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to receive stock"); return; }
      toast.success("Stock received");
      router.push(`/dispatch/inventory/${json.data?.id ?? ""}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Receive FG Stock"
        description="Record incoming finished goods into a new lot"
        actions={
          <Button variant="outline" asChild>
            <Link href="/dispatch/inventory">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Lot Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Product <span className="text-destructive">*</span></Label>
              <Select
                value={form.productId || "__none"}
                onValueChange={(v) => setForm((p) => ({ ...p, productId: v === "__none" ? "" : v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select product</SelectItem>
                  {products.map((prod) => (
                    <SelectItem key={prod.id} value={prod.id}>
                      {prod.code} — {prod.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="lotNumber">Lot Number (optional)</Label>
              <Input
                id="lotNumber"
                name="lotNumber"
                value={form.lotNumber}
                onChange={handleChange}
                placeholder="e.g. LOT-2026-001"
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="quantityIn">Quantity In <span className="text-destructive">*</span></Label>
                <Input
                  id="quantityIn"
                  name="quantityIn"
                  type="number"
                  min="0.001"
                  step="any"
                  value={form.quantityIn}
                  onChange={handleChange}
                  placeholder="e.g. 1000"
                  disabled={submitting}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="unitCost">Unit Cost (optional)</Label>
                <Input
                  id="unitCost"
                  name="unitCost"
                  type="number"
                  min="0"
                  step="any"
                  value={form.unitCost}
                  onChange={handleChange}
                  placeholder="e.g. 1.50"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="bestBefore">Best Before Date (optional)</Label>
              <Input
                id="bestBefore"
                name="bestBefore"
                type="date"
                value={form.bestBefore}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label>Warehouse (optional)</Label>
              <Select
                value={form.warehouseId || "__none"}
                onValueChange={(v) => setForm((p) => ({ ...p, warehouseId: v === "__none" ? "" : v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No warehouse</SelectItem>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                disabled={submitting}
                placeholder="Any additional notes..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Receive Stock
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/dispatch/inventory">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
