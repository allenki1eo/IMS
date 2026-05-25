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
import { BREWERY_SAMPLE_POINTS, BREWERY_TEST_STAGES, BREWERY_TEST_TYPES } from "@/modules/qc/brewery-qc";

interface StandardOption {
  id: string;
  code: string;
  name: string;
}

interface ItemOption {
  id: string;
  name: string;
  code?: string;
}

interface BatchOption {
  id: string;
  reference: string;
  productName: string;
  status: string;
}

interface FormData {
  testType: string;
  testStage: string;
  samplePoint: string;
  standardId: string;
  itemId: string;
  productionBatchId: string;
  batchNumber: string;
  sampleQty: string;
  sampleUnit: string;
  notes: string;
}

export default function NewQcTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillStandardId = searchParams.get("standardId") ?? "";

  const [form, setForm] = useState<FormData>({
    testType: "WORT",
    testStage: "",
    samplePoint: "",
    standardId: prefillStandardId,
    itemId: "",
    productionBatchId: "",
    batchNumber: "",
    sampleQty: "",
    sampleUnit: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [standards, setStandards] = useState<StandardOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/qc/standards?pageSize=200").then((r) => r.json()),
      fetch("/api/items?pageSize=200").then((r) => r.json()),
      fetch("/api/production/batches?pageSize=200").then((r) => r.json()),
    ])
      .then(([stdData, itemsData, batchData]) => {
        setStandards(stdData.data ?? []);
        setItems(itemsData.data ?? []);
        setBatches(batchData.data ?? []);
      })
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.testType) {
      toast.error("Test type is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/qc/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testType: form.testType,
          testStage: form.testStage || undefined,
          samplePoint: form.samplePoint || undefined,
          standardId: form.standardId || undefined,
          itemId: form.itemId || undefined,
          productionBatchId: form.productionBatchId || undefined,
          batchNumber: form.batchNumber.trim() || undefined,
          sampleQty: form.sampleQty ? parseFloat(form.sampleQty) : undefined,
          sampleUnit: form.sampleUnit.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create test"); return; }
      toast.success("Lab test created");
      router.push(`/qc/tests/${json.data?.id ?? ""}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Lab Test"
        description="Create a quality control lab test"
        actions={
          <Button variant="outline" asChild>
            <Link href="/qc/tests">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Test Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Test Type <span className="text-destructive">*</span></Label>
              <Select
                value={form.testType}
                onValueChange={(v) => setForm((p) => ({ ...p, testType: v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BREWERY_TEST_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Brewing Stage</Label>
                <Select
                  value={form.testStage || "__none"}
                  onValueChange={(v) => setForm((p) => ({ ...p, testStage: v === "__none" ? "" : v }))}
                  disabled={submitting}
                >
                  <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No stage</SelectItem>
                    {BREWERY_TEST_STAGES.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Sample Point</Label>
                <Select
                  value={form.samplePoint || "__none"}
                  onValueChange={(v) => setForm((p) => ({ ...p, samplePoint: v === "__none" ? "" : v }))}
                  disabled={submitting}
                >
                  <SelectTrigger><SelectValue placeholder="Select sample point" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No sample point</SelectItem>
                    {BREWERY_SAMPLE_POINTS.map((point) => (
                      <SelectItem key={point.value} value={point.value}>{point.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Quality Standard (optional)</Label>
              <Select
                value={form.standardId || "__none"}
                onValueChange={(v) => setForm((p) => ({ ...p, standardId: v === "__none" ? "" : v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select standard" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No standard</SelectItem>
                  {standards.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Production Batch (optional)</Label>
              <Select
                value={form.productionBatchId || "__none"}
                onValueChange={(v) => {
                  const batchId = v === "__none" ? "" : v;
                  const selected = batches.find((batch) => batch.id === batchId);
                  setForm((p) => ({
                    ...p,
                    productionBatchId: batchId,
                    batchNumber: selected?.reference ?? p.batchNumber,
                  }));
                }}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select production batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No production batch</SelectItem>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.reference} - {batch.productName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Item (optional)</Label>
              <Select
                value={form.itemId || "__none"}
                onValueChange={(v) => setForm((p) => ({ ...p, itemId: v === "__none" ? "" : v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No item</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.code ? `${item.code} — ` : ""}{item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="batchNumber">Batch Number (optional)</Label>
              <Input
                id="batchNumber"
                name="batchNumber"
                value={form.batchNumber}
                onChange={handleChange}
                placeholder="e.g. BATCH-2024-001"
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="sampleQty">Sample Quantity (optional)</Label>
                <Input
                  id="sampleQty"
                  name="sampleQty"
                  type="number"
                  min="0"
                  step="any"
                  value={form.sampleQty}
                  onChange={handleChange}
                  placeholder="e.g. 5"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sampleUnit">Sample Unit (optional)</Label>
                <Input
                  id="sampleUnit"
                  name="sampleUnit"
                  value={form.sampleUnit}
                  onChange={handleChange}
                  placeholder="e.g. kg, L, units"
                  disabled={submitting}
                />
              </div>
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
                placeholder="Any additional notes about this test..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Test
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/qc/tests">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
