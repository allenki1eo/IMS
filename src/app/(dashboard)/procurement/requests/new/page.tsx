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
import {
  formatMoney,
  PRIORITIES,
  sanitizeDecimalInput,
  createLineKey,
} from "../../_components/procurement-ui";

interface DepartmentOption {
  id: string;
  name: string;
}

interface RequestLineForm {
  key: string;
  description: string;
  itemCode: string;
  quantity: string;
  uom: string;
  estimatedUnitCost: string;
}

function emptyLine(): RequestLineForm {
  return {
    key: createLineKey(),
    description: "",
    itemCode: "",
    quantity: "1",
    uom: "PCS",
    estimatedUnitCost: "",
  };
}

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
  const [lines, setLines] = useState<RequestLineForm[]>([emptyLine()]);
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [attempted, setAttempted] = useState(false);

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

  function updateLine(key: string, patch: Partial<RequestLineForm>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
    if (attempted) {
      setLineErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((line) => line.key !== key)));
    setLineErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validateLines(current: RequestLineForm[]) {
    const errors: Record<string, string> = {};
    for (const line of current) {
      if (!line.description.trim()) {
        errors[line.key] = "Description is required";
        continue;
      }
      if (!line.quantity.trim() || Number(line.quantity) <= 0) {
        errors[line.key] = "Quantity must be greater than 0";
        continue;
      }
      if (line.estimatedUnitCost.trim() && Number(line.estimatedUnitCost) < 0) {
        errors[line.key] = "Estimated unit cost cannot be negative";
        continue;
      }
      if (line.estimatedUnitCost.trim() && Number.isNaN(Number(line.estimatedUnitCost))) {
        errors[line.key] = "Enter a valid unit cost (e.g. 1000 or 1000.50)";
      }
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);

    if (!form.purpose.trim()) {
      toast.error("Purpose is required");
      return;
    }

    const errors = validateLines(lines);
    setLineErrors(errors);
    const validLines = lines.filter((line) => line.description.trim() && Number(line.quantity) > 0);
    if (!validLines.length || Object.keys(errors).length > 0) {
      toast.error("Fix the highlighted line items before submitting");
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
      if (!res.ok) {
        toast.error(json.error ?? "Failed to create purchase request");
        return;
      }
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
            <Link href="/procurement/requests">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="purpose">
                Purpose <span className="text-destructive">*</span>
              </Label>
              <Input
                id="purpose"
                name="purpose"
                value={form.purpose}
                onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
                disabled={submitting}
                placeholder="What is this purchase for?"
                autoComplete="off"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}
                  disabled={submitting}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="departmentId">Department</Label>
                <Select
                  value={form.departmentId || "__none"}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, departmentId: v === "__none" ? "" : v }))
                  }
                  disabled={submitting}
                >
                  <SelectTrigger id="departmentId">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="neededBy">Needed By</Label>
                <Input
                  id="neededBy"
                  name="neededBy"
                  type="date"
                  value={form.neededBy}
                  onChange={(e) => setForm((p) => ({ ...p, neededBy: e.target.value }))}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
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
            <Button
              type="button"
              size="sm"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
              disabled={submitting}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Line
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line, index) => {
              const descriptionId = `line-${line.key}-description`;
              const itemCodeId = `line-${line.key}-itemCode`;
              const quantityId = `line-${line.key}-quantity`;
              const uomId = `line-${line.key}-uom`;
              const unitCostId = `line-${line.key}-unitCost`;
              const error = lineErrors[line.key];

              return (
                <div
                  key={line.key}
                  className={`grid gap-3 rounded-md border p-3 lg:grid-cols-[1fr_140px_100px_100px_140px_40px] ${
                    error ? "border-destructive/60" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <Label htmlFor={descriptionId} className="text-xs">
                      Item description <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={descriptionId}
                      name={descriptionId}
                      value={line.description}
                      onChange={(e) => updateLine(line.key, { description: e.target.value })}
                      disabled={submitting}
                      placeholder="Item or service"
                      autoComplete="off"
                      aria-invalid={Boolean(error && !line.description.trim())}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={itemCodeId} className="text-xs">
                      Item code
                    </Label>
                    <Input
                      id={itemCodeId}
                      name={itemCodeId}
                      value={line.itemCode}
                      onChange={(e) => updateLine(line.key, { itemCode: e.target.value })}
                      disabled={submitting}
                      placeholder="Optional"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={quantityId} className="text-xs">
                      Quantity <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={quantityId}
                      name={quantityId}
                      type="text"
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.key, { quantity: sanitizeDecimalInput(e.target.value) })
                      }
                      disabled={submitting}
                      placeholder="1"
                      autoComplete="off"
                      aria-invalid={Boolean(error && !(Number(line.quantity) > 0))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={uomId} className="text-xs">
                      Unit of measure
                    </Label>
                    <Input
                      id={uomId}
                      name={uomId}
                      value={line.uom}
                      onChange={(e) => updateLine(line.key, { uom: e.target.value })}
                      disabled={submitting}
                      placeholder="PCS"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={unitCostId} className="text-xs">
                      Estimated unit cost
                    </Label>
                    <Input
                      id={unitCostId}
                      name={unitCostId}
                      type="text"
                      inputMode="decimal"
                      value={line.estimatedUnitCost}
                      onChange={(e) =>
                        updateLine(line.key, {
                          estimatedUnitCost: sanitizeDecimalInput(e.target.value),
                        })
                      }
                      disabled={submitting}
                      placeholder="e.g. 1000"
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive hover:text-destructive"
                      onClick={() => removeLine(line.key)}
                      disabled={submitting || lines.length === 1}
                      aria-label={`Remove line ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {error && (
                    <p className="text-xs text-destructive lg:col-span-6" role="alert">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
            <div className="flex justify-end border-t pt-3 text-sm">
              <span className="text-muted-foreground mr-3">Estimated Total</span>
              <span className="font-semibold">{formatMoney(total)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting && <LoadingSpinner className="mr-2" />}
            Create Request
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/procurement/requests">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
