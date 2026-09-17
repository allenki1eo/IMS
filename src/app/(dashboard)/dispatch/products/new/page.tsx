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

interface WarehouseOption {
  id: string;
  name: string;
  code?: string;
}

interface FormData {
  code: string;
  name: string;
  uom: string;
  unitPrice: string;
  description: string;
  lineFamily: string;
  abvPct: string;
  packSize: string;
  packUom: string;
  unitsPerCase: string;
  requiresTraStamp: boolean;
  traStampType: string;
  defaultWarehouseId: string;
}

export default function NewFgProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    code: "",
    name: "",
    uom: "UNIT",
    unitPrice: "",
    description: "",
    lineFamily: "BREWING",
    abvPct: "",
    packSize: "",
    packUom: "",
    unitsPerCase: "",
    requiresTraStamp: false,
    traStampType: "",
    defaultWarehouseId: "",
  });
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/warehouses?pageSize=200")
      .then((r) => r.json())
      .then((json) => setWarehouses(json.data ?? []))
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleLineFamilyChange(v: string) {
    setForm((prev) => ({
      ...prev,
      lineFamily: v,
      requiresTraStamp: v === "SPIRITS" ? (prev.packSize ? true : prev.requiresTraStamp) : prev.requiresTraStamp,
      traStampType:
        prev.traStampType ||
        (v === "SPIRITS" ? "SPIRITS" : v === "BREWING" ? "BEER" : prev.traStampType),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) {
      toast.error("Product code is required");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (form.lineFamily === "SPIRITS" && !form.abvPct) {
      toast.error("ABV % is required for SPIRITS products");
      return;
    }
    if (form.requiresTraStamp && !form.traStampType.trim()) {
      toast.error("TRA stamp type is required when stamps are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/dispatch/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          uom: form.uom.trim() || "UNIT",
          unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined,
          description: form.description.trim() || undefined,
          lineFamily: form.lineFamily,
          abvPct: form.abvPct ? parseFloat(form.abvPct) : undefined,
          packSize: form.packSize ? parseFloat(form.packSize) : undefined,
          packUom: form.packUom.trim() || undefined,
          unitsPerCase: form.unitsPerCase ? parseInt(form.unitsPerCase, 10) : undefined,
          requiresTraStamp: form.requiresTraStamp,
          traStampType: form.traStampType.trim() || undefined,
          defaultWarehouseId: form.defaultWarehouseId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to create product");
        return;
      }
      toast.success("Product created");
      router.push(`/dispatch/products/${json.data?.id ?? ""}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New FG Product"
        description="Create a finished goods product (brewing or spirits)"
        actions={
          <Button variant="outline" asChild>
            <Link href="/dispatch/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="e.g. FG-001"
                  disabled={submitting}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Line Family <span className="text-destructive">*</span></Label>
                <Select value={form.lineFamily} onValueChange={handleLineFamilyChange} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BREWING">BREWING</SelectItem>
                    <SelectItem value="SPIRITS">SPIRITS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Premium Lager 500ml"
                disabled={submitting}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="uom">Unit of Measure</Label>
                <Input
                  id="uom"
                  name="uom"
                  value={form.uom}
                  onChange={handleChange}
                  placeholder="e.g. UNIT, CASE, L"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="abvPct">
                  ABV % {form.lineFamily === "SPIRITS" && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="abvPct"
                  name="abvPct"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={form.abvPct}
                  onChange={handleChange}
                  placeholder="e.g. 40"
                  disabled={submitting}
                  required={form.lineFamily === "SPIRITS"}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="unitPrice">Unit Price (optional)</Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  min="0"
                  step="any"
                  value={form.unitPrice}
                  onChange={handleChange}
                  placeholder="e.g. 2.50"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="packSize">Pack Size</Label>
                <Input
                  id="packSize"
                  name="packSize"
                  type="number"
                  min="0"
                  step="any"
                  value={form.packSize}
                  onChange={handleChange}
                  placeholder="e.g. 0.75"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="packUom">Pack UOM</Label>
                <Input
                  id="packUom"
                  name="packUom"
                  value={form.packUom}
                  onChange={handleChange}
                  placeholder="L / ML"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="unitsPerCase">Units / Case</Label>
                <Input
                  id="unitsPerCase"
                  name="unitsPerCase"
                  type="number"
                  min="1"
                  step="1"
                  value={form.unitsPerCase}
                  onChange={handleChange}
                  placeholder="e.g. 12"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="requiresTraStamp"
                    checked={form.requiresTraStamp}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                  Requires TRA stamp
                </label>
              </div>
              <div className="space-y-1">
                <Label htmlFor="traStampType">
                  TRA Stamp Type {form.requiresTraStamp && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={form.traStampType || "__none"}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, traStampType: v === "__none" ? "" : v }))
                  }
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stamp type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    <SelectItem value="BEER">BEER</SelectItem>
                    <SelectItem value="SPIRITS">SPIRITS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Default Warehouse (optional)</Label>
              <Select
                value={form.defaultWarehouseId || "__none"}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, defaultWarehouseId: v === "__none" ? "" : v }))
                }
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No default</SelectItem>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                disabled={submitting}
                placeholder="Any additional product description..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Product
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/dispatch/products">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
