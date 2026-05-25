"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BatchOption {
  id: string;
  batchNumber: string;
  stampType: string;
  quantity: number;
  used: number;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function NewActivationPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [form, setForm] = useState({
    batchId: "",
    productName: "",
    quantity: "",
    activatedAt: today(),
    notes: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const batchId = params.get("batchId") ?? "";
    if (batchId) setForm((f) => ({ ...f, batchId }));

    fetch("/api/tra-stamps/batches?status=ACTIVE&pageSize=200")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setBatches(json.data ?? []);
      })
      .catch(() => toast.error("Failed to load stamp batches"))
      .finally(() => setLoadingBatches(false));
  }, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const selectedBatch = batches.find((b) => b.id === form.batchId);
  const balance = selectedBatch ? selectedBatch.quantity - selectedBatch.used : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.batchId) return toast.error("Please select a stamp batch");
    if (!form.productName.trim()) return toast.error("Product name is required");
    if (!form.quantity || Number(form.quantity) <= 0) return toast.error("Quantity must be greater than 0");
    if (balance !== null && Number(form.quantity) > balance) {
      return toast.error(`Quantity exceeds available balance (${balance.toLocaleString()})`);
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tra-stamps/activations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: form.batchId,
          productName: form.productName.trim(),
          quantity: Number(form.quantity),
          activatedAt: form.activatedAt || null,
          notes: form.notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Failed to record activation");
        return;
      }
      toast.success("Stamp activation recorded successfully");
      router.push("/tra-stamps/activations");
    } catch {
      toast.error("Failed to record activation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Record Stamp Activation"
        description="Record TRA stamps applied to a product"
      />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Activation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="batchId">Stamp Batch *</Label>
              <Select
                value={form.batchId}
                onValueChange={(v) => set("batchId", v)}
                disabled={loadingBatches}
              >
                <SelectTrigger id="batchId">
                  <SelectValue placeholder={loadingBatches ? "Loading..." : "Select a batch"} />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.batchNumber} ({b.stampType}) — Balance: {(b.quantity - b.used).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBatch && (
                <p className="text-xs text-muted-foreground">
                  Available: <span className="font-medium text-foreground">{balance?.toLocaleString()}</span> stamps
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                value={form.productName}
                onChange={(e) => set("productName", e.target.value)}
                placeholder="e.g. Castle Lager 500ml"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={balance ?? undefined}
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                placeholder="Number of stamps to activate"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="activatedAt">Activation Date</Label>
              <Input
                id="activatedAt"
                type="date"
                value={form.activatedAt}
                onChange={(e) => set("activatedAt", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Optional notes"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Record Activation"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/tra-stamps/activations")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
