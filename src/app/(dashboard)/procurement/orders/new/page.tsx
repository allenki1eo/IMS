"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "../../_components/procurement-ui";

interface SupplierOption {
  id: string;
  code: string;
  name: string;
}

interface RequestOption {
  id: string;
  reference: string;
  purpose: string;
}

interface RequestDetail extends RequestOption {
  status: string;
  notes?: string | null;
  lines: Array<{
    itemId?: string | null;
    itemCode?: string | null;
    description: string;
    quantity: number;
    uom: string;
    estimatedUnitCost?: number | null;
  }>;
}

interface OrderLineForm {
  itemId: string;
  description: string;
  itemCode: string;
  quantity: string;
  uom: string;
  unitCost: string;
}

const EMPTY_LINE: OrderLineForm = {
  itemId: "",
  description: "",
  itemCode: "",
  quantity: "1",
  uom: "PCS",
  unitCost: "",
};

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [requests, setRequests] = useState<RequestOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    supplierId: "",
    requestId: "",
    expectedDelivery: "",
    taxAmount: "",
    currency: "TZS",
    notes: "",
  });
  const [lines, setLines] = useState<OrderLineForm[]>([{ ...EMPTY_LINE }]);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);

  const loadRequestIntoOrder = useCallback(async (requestId: string) => {
    try {
      const res = await fetch(`/api/procurement/requests/${requestId}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to load purchase request");
        return;
      }

      const request = json.data as RequestDetail;
      if (request.status !== "APPROVED") {
        toast.error("Only approved purchase requests can be converted");
        return;
      }
      if (!request.lines.length) {
        toast.error("Selected purchase request has no lines");
        return;
      }

      setForm((prev) => ({
        ...prev,
        requestId,
        notes: prev.notes || request.notes || request.purpose || "",
      }));
      setLines(request.lines.map((line) => ({
        itemId: line.itemId ?? "",
        description: line.description,
        itemCode: line.itemCode ?? "",
        quantity: String(line.quantity),
        uom: line.uom || "PCS",
        unitCost: line.estimatedUnitCost == null ? "0" : String(line.estimatedUnitCost),
      })));
      toast.success(`Loaded lines from ${request.reference}`);
    } catch {
      toast.error("Failed to load purchase request");
    }
  }, []);

  useEffect(() => {
    if (form.currency === "TZS") { setExchangeRate(null); return; }
    setRateLoading(true);
    fetch(`/api/finance/exchange-rates/latest?from=${form.currency}&to=TZS`)
      .then((r) => r.json())
      .then((d) => setExchangeRate(d.data?.rate ?? null))
      .catch(() => setExchangeRate(null))
      .finally(() => setRateLoading(false));
  }, [form.currency]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const supplierId = params.get("supplierId") ?? "";
    const requestId = params.get("requestId") ?? "";
    if (supplierId || requestId) setForm((prev) => ({ ...prev, supplierId, requestId }));
    if (requestId) void loadRequestIntoOrder(requestId);

    Promise.all([
      fetch("/api/procurement/suppliers?status=ACTIVE&pageSize=200").then((r) => r.json()),
      fetch("/api/procurement/requests?status=APPROVED&pageSize=200").then((r) => r.json()),
    ])
      .then(([suppliersData, requestsData]) => {
        setSuppliers(suppliersData.data ?? []);
        setRequests(requestsData.data ?? []);
      })
      .catch(() => toast.error("Failed to load form options"));
  }, [loadRequestIntoOrder]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => {
    const qty = Number(line.quantity || 0);
    const unit = Number(line.unitCost || 0);
    return sum + qty * unit;
  }, 0), [lines]);
  const tax = Number(form.taxAmount || 0);
  const total = subtotal + tax;

  function updateLine(index: number, patch: Partial<OrderLineForm>) {
    setLines((prev) => prev.map((line, i) => i === index ? { ...line, ...patch } : line));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.supplierId) {
      toast.error("Supplier is required");
      return;
    }
    const validLines = lines.filter((line) => line.description.trim() && Number(line.quantity) > 0 && Number(line.unitCost) >= 0);
    if (!validLines.length) {
      toast.error("At least one valid order line is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/procurement/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: form.supplierId,
          requestId: form.requestId || undefined,
          expectedDelivery: form.expectedDelivery || undefined,
          taxAmount: form.taxAmount ? Number(form.taxAmount) : 0,
          currency: form.currency || "USD",
          notes: form.notes || undefined,
          lines: validLines.map((line) => ({
            description: line.description.trim(),
            itemCode: line.itemCode || undefined,
            itemId: line.itemId || undefined,
            quantity: Number(line.quantity),
            uom: line.uom || "PCS",
            unitCost: Number(line.unitCost),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create purchase order"); return; }
      toast.success("Purchase order created");
      router.push(`/procurement/orders/${json.data.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Purchase Order"
        description="Create an order for a supplier"
        actions={
          <Button variant="outline" asChild>
            <Link href="/procurement/orders"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Supplier <span className="text-destructive">*</span></Label>
                <Select value={form.supplierId || "__none"} onValueChange={(v) => setForm((p) => ({ ...p, supplierId: v === "__none" ? "" : v }))} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select supplier...</SelectItem>
                    {suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.code} - {supplier.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Approved Request</Label>
                <Select value={form.requestId || "__none"} onValueChange={(v) => {
                  const requestId = v === "__none" ? "" : v;
                  setForm((p) => ({ ...p, requestId }));
                  if (requestId) void loadRequestIntoOrder(requestId);
                }} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Optional request" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No linked request</SelectItem>
                    {requests.map((request) => <SelectItem key={request.id} value={request.id}>{request.reference} - {request.purpose}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="expectedDelivery">Expected Delivery</Label>
                <Input id="expectedDelivery" type="date" value={form.expectedDelivery} onChange={(e) => setForm((p) => ({ ...p, expectedDelivery: e.target.value }))} disabled={submitting} />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))} disabled={submitting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TZS">TZS — Tanzanian Shilling</SelectItem>
                    <SelectItem value="USD">USD — US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                    <SelectItem value="KES">KES — Kenyan Shilling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="taxAmount">Tax Amount</Label>
                <Input id="taxAmount" type="number" min="0" step="0.01" value={form.taxAmount} onChange={(e) => setForm((p) => ({ ...p, taxAmount: e.target.value }))} disabled={submitting} />
              </div>
            </div>

            {form.currency !== "TZS" && (
              <div className="flex items-center gap-3 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-800">
                <span className="font-medium">Exchange Rate:</span>
                {rateLoading ? (
                  <span className="text-muted-foreground">Loading…</span>
                ) : exchangeRate != null ? (
                  <>
                    <span>1 {form.currency} = {exchangeRate.toLocaleString()} TZS</span>
                    {total > 0 && (
                      <span className="ml-auto font-semibold">
                        ≈ {(total * exchangeRate).toLocaleString(undefined, { style: "currency", currency: "TZS", maximumFractionDigits: 0 })} TZS
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-amber-700">No exchange rate found — add one in Finance › Exchange Rates</span>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                disabled={submitting}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Order Lines</CardTitle>
            <Button type="button" size="sm" onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])} disabled={submitting}>
              <Plus className="h-4 w-4 mr-1" />Add Line
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="grid gap-3 rounded-md border p-3 lg:grid-cols-[1fr_140px_100px_100px_140px_40px]">
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} disabled={submitting} placeholder="Item or service" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Item Code</Label>
                  <Input value={line.itemCode} onChange={(e) => updateLine(index, { itemCode: e.target.value })} disabled={submitting} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" min="0" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} disabled={submitting} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">UOM</Label>
                  <Input value={line.uom} onChange={(e) => updateLine(index, { uom: e.target.value })} disabled={submitting} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit Cost</Label>
                  <Input type="number" min="0" step="0.01" value={line.unitCost} onChange={(e) => updateLine(index, { unitCost: e.target.value })} disabled={submitting} />
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive" onClick={() => removeLine(index)} disabled={submitting || lines.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="ml-auto max-w-xs space-y-2 border-t pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(subtotal, form.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(tax, form.currency)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatMoney(total, form.currency)}</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>{submitting && <LoadingSpinner className="mr-2" />}Create Order</Button>
          <Button type="button" variant="outline" asChild><Link href="/procurement/orders">Cancel</Link></Button>
        </div>
      </form>
    </div>
  );
}

