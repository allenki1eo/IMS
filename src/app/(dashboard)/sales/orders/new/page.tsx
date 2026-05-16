"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomerOption {
  id: string;
  code: string;
  name: string;
}

interface LineForm {
  productCode: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
}

const EMPTY_LINE: LineForm = {
  productCode: "",
  description: "",
  quantity: "1",
  unitPrice: "0",
  discount: "0",
};

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    reference: "",
    priority: "NORMAL",
    orderDate: new Date().toISOString().slice(0, 10),
    requiredDate: "",
    taxAmount: "0",
    currency: "TZS",
    notes: "",
  });
  const [lines, setLines] = useState<LineForm[]>([{ ...EMPTY_LINE }]);

  useEffect(() => {
    fetch("/api/sales/customers?status=ACTIVE&pageSize=200")
      .then((r) => r.json())
      .then((d) => setCustomers(d.data?.data ?? d.data ?? []))
      .catch(() => toast.error("Failed to load customers"));
  }, []);

  const subtotal = useMemo(() => lines.reduce((sum, line) => {
    const qty = Number(line.quantity || 0);
    const price = Number(line.unitPrice || 0);
    const discount = Number(line.discount || 0);
    return sum + qty * price - discount;
  }, 0), [lines]);

  const tax = Number(form.taxAmount || 0);
  const total = subtotal + tax;

  function updateLine(index: number, patch: Partial<LineForm>) {
    setLines((prev) => prev.map((line, i) => i === index ? { ...line, ...patch } : line));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
  }

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) { toast.error("Customer is required"); return; }
    if (!form.reference.trim()) { toast.error("Reference is required"); return; }

    const validLines = lines.filter((l) => l.productCode.trim() && l.description.trim() && Number(l.quantity) > 0);
    if (validLines.length === 0) { toast.error("At least one valid order line is required"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: form.customerId,
          reference: form.reference.trim(),
          priority: form.priority,
          orderDate: form.orderDate || undefined,
          requiredDate: form.requiredDate || undefined,
          taxAmount: Number(form.taxAmount || 0),
          currency: form.currency,
          notes: form.notes.trim() || undefined,
          subtotal,
          totalAmount: total,
          lines: validLines.map((l) => ({
            productCode: l.productCode.trim(),
            description: l.description.trim(),
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            discount: Number(l.discount || 0),
            totalPrice: Number(l.quantity) * Number(l.unitPrice) - Number(l.discount || 0),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create order"); return; }
      toast.success("Sales order created");
      router.push(`/sales/orders/${json.data.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Sales Order"
        description="Create a new customer sales order"
        actions={
          <Button variant="outline" asChild>
            <Link href="/sales/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Order Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm((p) => ({ ...p, customerId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Reference *</Label>
              <Input
                value={form.reference}
                onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
                placeholder="e.g. SO-2026-001"
              />
            </div>

            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Order Date</Label>
              <Input
                type="date"
                value={form.orderDate}
                onChange={(e) => setForm((p) => ({ ...p, orderDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Required Date</Label>
              <Input
                type="date"
                value={form.requiredDate}
                onChange={(e) => setForm((p) => ({ ...p, requiredDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TZS">TZS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="KES">KES</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional notes..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Lines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Order Lines</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" />
              Add Line
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Product Code</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Unit Price</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Discount</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Line Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => {
                    const lineTotal = Number(line.quantity || 0) * Number(line.unitPrice || 0) - Number(line.discount || 0);
                    return (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">
                          <Input
                            value={line.productCode}
                            onChange={(e) => updateLine(i, { productCode: e.target.value })}
                            placeholder="SKU-001"
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={line.description}
                            onChange={(e) => updateLine(i, { description: e.target.value })}
                            placeholder="Product description"
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={line.quantity}
                            onChange={(e) => updateLine(i, { quantity: e.target.value })}
                            className="h-8 text-xs text-right w-20"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                            className="h-8 text-xs text-right w-28"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={line.discount}
                            onChange={(e) => updateLine(i, { discount: e.target.value })}
                            className="h-8 text-xs text-right w-24"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                          {form.currency} {formatMoney(lineTotal)}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(i)}
                            disabled={lines.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/30 border-t">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right text-sm text-muted-foreground">Subtotal</td>
                    <td className="px-3 py-2 text-right font-medium">{form.currency} {formatMoney(subtotal)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-sm text-muted-foreground">Tax Amount</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={form.taxAmount}
                        onChange={(e) => setForm((p) => ({ ...p, taxAmount: e.target.value }))}
                        className="h-8 text-xs text-right w-24 ml-auto"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{form.currency} {formatMoney(tax)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right font-semibold">Total</td>
                    <td className="px-3 py-2 text-right font-bold text-lg">{form.currency} {formatMoney(total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/sales/orders">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <LoadingSpinner className="mr-2" /> : null}
            Create Order
          </Button>
        </div>
      </form>
    </div>
  );
}
