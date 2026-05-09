"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

interface TankOption {
  id: string;
  name: string;
  fuelType: string;
  currentLevel: number;
  capacity: number;
}

interface FormData {
  tankId: string;
  supplierName: string;
  deliveryNoteRef: string;
  quantity: string;
  pricePerLiter: string;
  notes: string;
}

const DEFAULT: FormData = {
  tankId: "",
  supplierName: "",
  deliveryNoteRef: "",
  quantity: "",
  pricePerLiter: "",
  notes: "",
};

export default function NewReceiptPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [tanks, setTanks] = useState<TankOption[]>([]);

  useEffect(() => {
    fetch("/api/fuel-tanks?pageSize=200&status=ACTIVE")
      .then((r) => r.json())
      .then((d) => setTanks(d.data ?? []))
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const qty = parseFloat(form.quantity) || 0;
  const price = parseFloat(form.pricePerLiter) || 0;
  const totalCost = qty * price;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tankId || !form.quantity) {
      toast.error("Tank and quantity are required");
      return;
    }
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fuel-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tankId: form.tankId,
          supplierName: form.supplierName || undefined,
          deliveryNoteRef: form.deliveryNoteRef || undefined,
          quantity: qty,
          pricePerLiter: price || undefined,
          totalCost: totalCost || undefined,
          notes: form.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create receipt"); return; }
      toast.success("Receipt created");
      router.push(`/fuel/receipts/${json.data?.id ?? ""}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedTank = tanks.find((t) => t.id === form.tankId);

  return (
    <div>
      <PageHeader
        title="New Fuel Receipt"
        description="Record an incoming fuel delivery"
        actions={
          <Button variant="outline" asChild>
            <Link href="/fuel/receipts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Receipt Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Tank <span className="text-destructive">*</span></Label>
                <Select value={form.tankId || "__none"} onValueChange={(v) => setForm((p) => ({ ...p, tankId: v === "__none" ? "" : v }))} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select a tank...</SelectItem>
                    {tanks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} — {t.fuelType} ({t.currentLevel.toLocaleString()} / {t.capacity.toLocaleString()} L)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="supplierName">Supplier Name</Label>
                  <Input id="supplierName" name="supplierName" value={form.supplierName} onChange={handleChange} placeholder="e.g. Total Energies" disabled={submitting} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="deliveryNoteRef">Delivery Note Ref</Label>
                  <Input id="deliveryNoteRef" name="deliveryNoteRef" value={form.deliveryNoteRef} onChange={handleChange} placeholder="e.g. DN-2026-001" disabled={submitting} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="quantity">Quantity (L) <span className="text-destructive">*</span></Label>
                  <Input id="quantity" name="quantity" type="number" min="0" step="0.01" value={form.quantity} onChange={handleChange} placeholder="e.g. 5000" disabled={submitting} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pricePerLiter">Price per Liter</Label>
                  <Input id="pricePerLiter" name="pricePerLiter" type="number" min="0" step="0.001" value={form.pricePerLiter} onChange={handleChange} placeholder="e.g. 1.250" disabled={submitting} />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  disabled={submitting}
                  placeholder="Optional notes..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting && <LoadingSpinner className="mr-2" />}
                  Create Receipt
                </Button>
                <Button variant="outline" type="button" asChild>
                  <Link href="/fuel/receipts">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Computed total */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity</span>
                <span>{qty > 0 ? `${qty.toLocaleString()} L` : "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price / L</span>
                <span>{price > 0 ? `$${price.toFixed(3)}` : "—"}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total Cost</span>
                <span className="text-lg">
                  {totalCost > 0 ? `$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Selected tank info */}
          {selectedTank && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tank Info</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Level</span>
                  <span>{selectedTank.currentLevel.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity</span>
                  <span>{selectedTank.capacity.toLocaleString()} L</span>
                </div>
                {qty > 0 && (
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span className="text-muted-foreground">Level After Receipt</span>
                    <span className="text-green-600">
                      {Math.min(selectedTank.currentLevel + qty, selectedTank.capacity).toLocaleString()} L
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
