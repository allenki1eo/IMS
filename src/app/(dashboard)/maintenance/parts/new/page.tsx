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

interface CategoryOption {
  id: string;
  name: string;
}

interface FormData {
  code: string;
  name: string;
  categoryId: string;
  partNumber: string;
  uom: string;
  unitCost: string;
  currentStock: string;
  minStock: string;
  description: string;
}

const DEFAULT: FormData = {
  code: "",
  name: "",
  categoryId: "",
  partNumber: "",
  uom: "PCS",
  unitCost: "",
  currentStock: "0",
  minStock: "0",
  description: "",
};

export default function NewSparePartPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    fetch("/api/maintenance/spare-part-categories?pageSize=200")
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? []))
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code || !form.name || !form.uom) {
      toast.error("Code, name, and UOM are required");
      return;
    }
    const unitCostNum = parseFloat(form.unitCost) || 0;
    const currentStockNum = parseFloat(form.currentStock) || 0;
    const minStockNum = parseFloat(form.minStock) || 0;

    setSubmitting(true);
    try {
      const res = await fetch("/api/maintenance/spare-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          name: form.name,
          categoryId: form.categoryId || undefined,
          partNumber: form.partNumber || undefined,
          uom: form.uom,
          unitCost: unitCostNum,
          currentStock: currentStockNum,
          minStock: minStockNum,
          description: form.description || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create spare part"); return; }
      toast.success("Spare part created successfully");
      router.push(`/maintenance/parts/${json.data?.id ?? ""}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Add Spare Part"
        description="Register a new spare part in inventory"
        actions={
          <Button variant="outline" asChild>
            <Link href="/maintenance/parts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Part Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="code">Code <span className="text-destructive">*</span></Label>
                <Input
                  id="code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="e.g. SP-001"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Oil Filter"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={form.categoryId || "__none"}
                  onValueChange={(v) => setForm((p) => ({ ...p, categoryId: v === "__none" ? "" : v }))}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="partNumber">Part Number (optional)</Label>
                <Input
                  id="partNumber"
                  name="partNumber"
                  value={form.partNumber}
                  onChange={handleChange}
                  placeholder="e.g. OEM-12345"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="uom">Unit of Measure <span className="text-destructive">*</span></Label>
                <Input
                  id="uom"
                  name="uom"
                  value={form.uom}
                  onChange={handleChange}
                  placeholder="e.g. PCS, L, KG"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="unitCost">Unit Cost</Label>
                <Input
                  id="unitCost"
                  name="unitCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitCost}
                  onChange={handleChange}
                  placeholder="e.g. 25.00"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="currentStock">Initial Stock</Label>
                <Input
                  id="currentStock"
                  name="currentStock"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.currentStock}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="minStock">Minimum Stock</Label>
                <Input
                  id="minStock"
                  name="minStock"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minStock}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                disabled={submitting}
                placeholder="Optional description of this part..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Part
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/maintenance/parts">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
