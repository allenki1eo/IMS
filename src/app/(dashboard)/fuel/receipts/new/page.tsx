"use client";

import { useEffect, useState } from "react";
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
import { formatLiters } from "../../_components/fuel-ui";

interface Tank {
  id: string;
  name: string;
  code: string;
  fuelType: string;
  capacity: number;
  currentLevel: number;
}

export default function NewFuelReceiptPage() {
  const router = useRouter();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    tankId: "",
    supplierName: "",
    deliveryNoteRef: "",
    quantityLiters: "",
    pricePerLiter: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/fuel-tanks?isActive=true")
      .then((res) => res.json())
      .then((json) => setTanks(json.data ?? []))
      .catch(() => toast.error("Failed to load fuel tanks"));
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.tankId) { toast.error("Tank is required"); return; }
    if (!form.quantityLiters || Number(form.quantityLiters) <= 0) { toast.error("Quantity must be greater than zero"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fuel-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tankId: form.tankId,
          supplierName: form.supplierName.trim() || undefined,
          deliveryNoteRef: form.deliveryNoteRef.trim() || undefined,
          quantityLiters: Number(form.quantityLiters),
          pricePerLiter: form.pricePerLiter ? Number(form.pricePerLiter) : undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create receipt"); return; }
      toast.success("Fuel receipt created");
      router.push(`/fuel/receipts/${json.data?.id ?? json.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedTank = tanks.find((tank) => tank.id === form.tankId);

  return (
    <div>
      <PageHeader
        title="New Fuel Receipt"
        description="Record a fuel delivery before confirming it into a tank"
        actions={
          <Button variant="outline" asChild>
            <Link href="/fuel/receipts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-3xl">
        <CardHeader><CardTitle className="text-base">Receipt Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Tank <span className="text-destructive">*</span></Label>
              <Select value={form.tankId || "__none"} onValueChange={(value) => set("tankId", value === "__none" ? "" : value)} disabled={submitting}>
                <SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select tank</SelectItem>
                  {tanks.map((tank) => (
                    <SelectItem key={tank.id} value={tank.id}>
                      {tank.name} ({tank.code}) - {tank.fuelType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTank && (
                <p className="text-xs text-muted-foreground">
                  Current level: {formatLiters(selectedTank.currentLevel)} of {formatLiters(selectedTank.capacity)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="supplierName">Supplier</Label>
                <Input id="supplierName" value={form.supplierName} onChange={(e) => set("supplierName", e.target.value)} disabled={submitting} placeholder="Supplier name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="deliveryNoteRef">Delivery Note</Label>
                <Input id="deliveryNoteRef" value={form.deliveryNoteRef} onChange={(e) => set("deliveryNoteRef", e.target.value)} disabled={submitting} placeholder="Delivery reference" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quantityLiters">Quantity (liters) <span className="text-destructive">*</span></Label>
                <Input id="quantityLiters" type="number" min="0" step="0.01" value={form.quantityLiters} onChange={(e) => set("quantityLiters", e.target.value)} disabled={submitting} placeholder="5000" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pricePerLiter">Price / Liter</Label>
                <Input id="pricePerLiter" type="number" min="0" step="0.01" value={form.pricePerLiter} onChange={(e) => set("pricePerLiter", e.target.value)} disabled={submitting} placeholder="0.00" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} disabled={submitting} placeholder="Optional notes" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Receipt
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/fuel/receipts">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

