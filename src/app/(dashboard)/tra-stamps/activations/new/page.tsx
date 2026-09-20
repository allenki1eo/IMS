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
import { todayDateInputValue } from "@/lib/utils";

interface BatchOption {
  id: string;
  batchNumber: string;
  stampType: string;
  quantity: number;
  used: number;
}

interface ProductOption {
  id: string;
  code: string;
  name: string;
  traStampType?: string | null;
  requiresTraStamp?: boolean;
}

interface LotOption {
  id: string;
  lotNumber?: string | null;
  qaStatus?: string;
  availableQty: number;
  product?: { id: string; code: string; name: string } | null;
}

interface OrderOption {
  id: string;
  reference: string;
  customerName: string;
  status: string;
}

function today() {
  return todayDateInputValue();
}

export default function NewActivationPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [lots, setLots] = useState<LotOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    batchId: "",
    fgProductId: "",
    fgLotId: "",
    dispatchOrderId: "",
    quantity: "",
    activatedAt: today(),
    notes: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const batchId = params.get("batchId") ?? "";
    if (batchId) setForm((f) => ({ ...f, batchId }));

    Promise.all([
      fetch("/api/tra-stamps/batches?status=ACTIVE&pageSize=200").then((r) => r.json()),
      fetch("/api/dispatch/products?isActive=true&pageSize=200").then((r) => r.json()),
      fetch("/api/dispatch/orders?pageSize=50").then((r) => r.json()),
    ])
      .then(([batchJson, prodJson, orderJson]) => {
        if (batchJson.success !== false) setBatches(batchJson.data ?? []);
        setProducts((prodJson.data ?? []).filter((p: ProductOption) => p.requiresTraStamp));
        setOrders(
          (orderJson.data ?? []).filter((o: OrderOption) =>
            ["DRAFT", "CONFIRMED"].includes(o.status)
          )
        );
      })
      .catch(() => toast.error("Failed to load form data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.fgProductId) {
      setLots([]);
      return;
    }
    fetch(
      `/api/dispatch/inventory?productId=${form.fgProductId}&qaStatus=RELEASED&status=AVAILABLE&pageSize=200`
    )
      .then((r) => r.json())
      .then((json) => setLots(json.data ?? []))
      .catch(() => setLots([]));
  }, [form.fgProductId]);

  function set(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "fgProductId") {
        next.fgLotId = "";
      }
      return next;
    });
  }

  const selectedBatch = batches.find((b) => b.id === form.batchId);
  const selectedProduct = products.find((p) => p.id === form.fgProductId);
  const balance = selectedBatch ? selectedBatch.quantity - selectedBatch.used : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.batchId) return toast.error("Please select a stamp batch");
    if (!form.fgProductId) return toast.error("FG product is required");
    if (!form.fgLotId) return toast.error("FG lot is required");
    if (!form.quantity || Number(form.quantity) <= 0) return toast.error("Quantity must be greater than 0");
    if (balance !== null && Number(form.quantity) > balance) {
      return toast.error(`Quantity exceeds available balance (${balance.toLocaleString()})`);
    }
    if (
      selectedBatch &&
      selectedProduct?.traStampType &&
      selectedBatch.stampType.toUpperCase() !== selectedProduct.traStampType.toUpperCase()
    ) {
      return toast.error(
        `Stamp type mismatch: batch ${selectedBatch.stampType} vs product ${selectedProduct.traStampType}`
      );
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tra-stamps/activations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: form.batchId,
          fgProductId: form.fgProductId,
          fgLotId: form.fgLotId,
          dispatchOrderId: form.dispatchOrderId || null,
          productName: selectedProduct?.name,
          quantity: Number(form.quantity),
          activatedAt: form.activatedAt || null,
          notes: form.notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
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
        description="Activate TRA stamps against a released FG lot"
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
                disabled={loading}
              >
                <SelectTrigger id="batchId">
                  <SelectValue placeholder={loading ? "Loading..." : "Select a batch"} />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.batchNumber} ({b.stampType}) — Balance:{" "}
                      {(b.quantity - b.used).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBatch && (
                <p className="text-xs text-muted-foreground">
                  Available:{" "}
                  <span className="font-medium text-foreground">{balance?.toLocaleString()}</span>{" "}
                  stamps
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>FG Product *</Label>
              <Select
                value={form.fgProductId || "__none"}
                onValueChange={(v) => set("fgProductId", v === "__none" ? "" : v)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select FG product requiring TRA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select product</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.name}
                      {p.traStampType ? ` (${p.traStampType})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>FG Lot (QA RELEASED) *</Label>
              <Select
                value={form.fgLotId || "__none"}
                onValueChange={(v) => set("fgLotId", v === "__none" ? "" : v)}
                disabled={!form.fgProductId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      form.fgProductId ? "Select released lot" : "Select product first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select lot</SelectItem>
                  {lots.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.lotNumber ?? l.id} — avail {l.availableQty.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Dispatch Order (optional)</Label>
              <Select
                value={form.dispatchOrderId || "__none"}
                onValueChange={(v) => set("dispatchOrderId", v === "__none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link to dispatch order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.reference} — {o.customerName} ({o.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
