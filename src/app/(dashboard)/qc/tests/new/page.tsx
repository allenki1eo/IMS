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

const TEST_TYPES = [
  { value: "INCOMING", label: "Incoming" },
  { value: "IN_PROCESS", label: "In Process" },
  { value: "FINAL", label: "Final" },
  { value: "PERIODIC", label: "Periodic" },
];

interface FormData {
  testType: string;
  standardId: string;
  itemId: string;
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
    testType: "INCOMING",
    standardId: prefillStandardId,
    itemId: "",
    batchNumber: "",
    sampleQty: "",
    sampleUnit: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [standards, setStandards] = useState<StandardOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/qc/standards?pageSize=200").then((r) => r.json()),
      fetch("/api/items?pageSize=200").then((r) => r.json()),
    ])
      .then(([stdData, itemsData]) => {
        setStandards(stdData.data ?? []);
        setItems(itemsData.data ?? []);
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
          standardId: form.standardId || undefined,
          itemId: form.itemId || undefined,
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
                  {TEST_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
