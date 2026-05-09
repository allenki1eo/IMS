"use client";

import { useEffect, useState } from "react";
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
import { formatMoney, PRIORITIES } from "../../_components/procurement-ui";

interface DepartmentOption {
  id: string;
  name: string;
}

interface RequestLineForm {
  description: string;
  itemCode: string;
  quantity: string;
  uom: string;
  estimatedUnitCost: string;
}

const EMPTY_LINE: RequestLineForm = {
  description: "",
  itemCode: "",
  quantity: "1",
  uom: "PCS",
  estimatedUnitCost: "",
};

export default function NewPurchaseRequestPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    purpose: "",
    priority: "NORMAL",
    departmentId: "",
    neededBy: "",
    notes: "",
  });
  const [lines, setLines] = useState<RequestLineForm[]>([{ ...EMPTY_LINE }]);

  useEffect(() => {
    fetch("/api/departments?pageSize=200")
      .then((r) => r.json())
      .then((d) => setDepartments(d.data ?? []))
      .catch(() => {});
  }, []);

  const total = lines.reduce((sum, line) => {
    const qty = Number(line.quantity || 0);
    const unit = Number(line.estimatedUnitCost || 0);
    return sum + qty * unit;
  }, 0);

  function updateLine(index: number, patch: Partial<RequestLineForm>) {
    setLines((prev) => prev.map((line, i) => i === index ? { ...line, ...patch } : line));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.purpose.trim()) {
      toast.error("Purpose is required");
      return;
    }
    const validLines = lines.filter((line) => line.description.trim() && Number(line.quantity) > 0);
    if (!validLines.length) {
      toast.error("At least one line with description and quantity is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/procurement/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: form.purpose.trim(),
          priority: form.priority,
          departmentId: form.departmentId || undefined,
          neededBy: form.neededBy || undefined,
          notes: form.notes || undefined,
          lines: validLines.map((line) => ({
            description: line.description.trim(),
            itemCode: line.itemCode || undefined,
            quantity: Number(line.quantity),
            uom: line.uom || "PCS",
            estimatedUnitCost: line.estimatedUnitCost ? Number(line.estimatedUnitCost) : undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create purchase request"); return; }
      toast.success("Purchase request created");
      router.push(`/procurement/requests/${json.data.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Purchase Request"
        description="Capture requested items and estimated cost"
        actions={
          <Button variant="outline" asChild>
            <Link href="/procurement/requests"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Request Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="purpose">Purpose <span className="text-destructive">*</span></Label>
              <Input id="purpose" value={form.purpose} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))} disabled={submitting} placeholder="What is this purchase for?" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))} disabled={submitting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Select value={form.departmentId || "__none"} onValueChange={(v) => setForm((p) => ({ ...p, departmentId: v === "__none" ? "" : v }))} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No department</SelectItem>
                    {departments.map((dept) => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="neededBy">Needed By</Label>
                <Input id="neededBy" type="date" value={form.neededBy} onChange={(e) => setForm((p) => ({ ...p, neededBy: e.target.value }))} disabled={submitting} />
              </div>
            </div>

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
            <CardTitle className="text-base">Request Lines</CardTitle>
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
                  <Label className="text-xs">Est. Unit Cost</Label>
                  <Input type="number" min="0" step="0.01" value={line.estimatedUnitCost} onChange={(e) => updateLine(index, { estimatedUnitCost: e.target.value })} disabled={submitting} />
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive" onClick={() => removeLine(index)} disabled={submitting || lines.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex justify-end border-t pt-3 text-sm">
              <span className="text-muted-foreground mr-3">Estimated Total</span>
              <span className="font-semibold">{formatMoney(total)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>{submitting && <LoadingSpinner className="mr-2" />}Create Request</Button>
          <Button type="button" variant="outline" asChild><Link href="/procurement/requests">Cancel</Link></Button>
        </div>
      </form>
    </div>
  );
}

