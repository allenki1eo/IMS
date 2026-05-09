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

interface Category { id: string; name: string; }
interface UOM { id: string; name: string; symbol: string; }

const ITEM_TYPES = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "FINISHED_GOOD", label: "Finished Good" },
  { value: "CONSUMABLE", label: "Consumable" },
  { value: "SPARE_PART", label: "Spare Part" },
  { value: "PACKAGING", label: "Packaging" },
];

interface FormState {
  code: string;
  name: string;
  description: string;
  itemType: string;
  categoryId: string;
  uomId: string;
  minStock: string;
  maxStock: string;
  reorderPoint: string;
}

const DEFAULT: FormState = {
  code: "",
  name: "",
  description: "",
  itemType: "RAW_MATERIAL",
  categoryId: "",
  uomId: "",
  minStock: "",
  maxStock: "",
  reorderPoint: "",
};

export default function NewItemPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/item-categories?pageSize=200").then((r) => r.json()),
      fetch("/api/uoms?pageSize=200").then((r) => r.json()),
    ])
      .then(([catJson, uomJson]) => {
        setCategories(catJson.data ?? []);
        setUoms(uomJson.data ?? []);
      })
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim() || !form.uomId) {
      toast.error("Code, Name and UOM are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          description: form.description || undefined,
          itemType: form.itemType,
          categoryId: form.categoryId || undefined,
          uomId: form.uomId,
          minStock: form.minStock ? Number(form.minStock) : undefined,
          maxStock: form.maxStock ? Number(form.maxStock) : undefined,
          reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create item"); return; }
      toast.success("Item created");
      router.push(`/warehouse/items/${json.data?.id ?? json.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Item"
        description="Add a new item to the catalog"
        actions={
          <Button variant="outline" asChild>
            <Link href="/warehouse/items">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="e.g. ITEM-001"
                  disabled={submitting}
                />
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
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Optional description"
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Item Type</Label>
                <Select
                  value={form.itemType}
                  onValueChange={(v) => setForm((p) => ({ ...p, itemType: v }))}
                  disabled={submitting}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={form.categoryId || "__none"}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, categoryId: v === "__none" ? "" : v }))
                  }
                  disabled={submitting}
                >
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>
                Unit of Measure <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.uomId || "__none"}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, uomId: v === "__none" ? "" : v }))
                }
                disabled={submitting}
              >
                <SelectTrigger><SelectValue placeholder="Select UOM" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select UOM</SelectItem>
                  {uoms.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="minStock">Min Stock</Label>
                <Input
                  id="minStock"
                  name="minStock"
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={handleChange}
                  placeholder="0"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="maxStock">Max Stock</Label>
                <Input
                  id="maxStock"
                  name="maxStock"
                  type="number"
                  min="0"
                  value={form.maxStock}
                  onChange={handleChange}
                  placeholder="0"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  name="reorderPoint"
                  type="number"
                  min="0"
                  value={form.reorderPoint}
                  onChange={handleChange}
                  placeholder="0"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Item
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/warehouse/items">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
