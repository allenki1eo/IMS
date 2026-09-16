"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Package, FlaskConical } from "lucide-react";
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
import { sanitizeDecimalInput } from "../../_components/production-ui";
import { PALE_ALE_BOM_LINES, PALE_ALE_RECIPE } from "@/modules/production/pale-ale-bom";

interface ItemOption {
  id: string;
  code: string;
  name: string;
  uom?: { symbol: string } | null;
  stockBalances?: { quantity: number }[];
}

interface MaterialForm {
  itemId: string;
  description: string;
  itemCode: string;
  quantity: string;
  uom: string;
  wastagePct: string;
}

const EMPTY_MATERIAL: MaterialForm = {
  itemId: "",
  description: "",
  itemCode: "",
  quantity: "1",
  uom: "KG",
  wastagePct: "0",
};

export default function NewProductionRecipePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [form, setForm] = useState({
    code: "",
    name: "",
    productCode: "",
    productName: "",
    batchSize: "",
    uom: "L",
    version: "1",
    notes: "",
  });
  const [materials, setMaterials] = useState<MaterialForm[]>([{ ...EMPTY_MATERIAL }]);

  useEffect(() => {
    fetch("/api/items?pageSize=500")
      .then((r) => r.json())
      .then((d) => setItems(d.data ?? []))
      .catch(() => toast.error("Failed to load warehouse items"))
      .finally(() => setItemsLoading(false));
  }, []);

  function updateMaterial(index: number, patch: Partial<MaterialForm>) {
    setMaterials((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function selectItem(index: number, itemId: string) {
    if (!itemId) {
      updateMaterial(index, { itemId: "", itemCode: "" });
      return;
    }
    const item = items.find((it) => it.id === itemId);
    if (!item) return;
    updateMaterial(index, {
      itemId: item.id,
      description: item.name,
      itemCode: item.code,
      uom: item.uom?.symbol ?? "KG",
    });
  }

  function removeMaterial(index: number) {
    setMaterials((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function currentStock(itemId: string): number {
    const item = items.find((it) => it.id === itemId);
    if (!item) return 0;
    return (item.stockBalances ?? []).reduce((sum, b) => sum + (b.quantity || 0), 0);
  }

  function applyPaleAleTemplate() {
    const lines: MaterialForm[] = PALE_ALE_BOM_LINES.map((line) => {
      const match = items.find((it) => it.code === line.itemCode);
      return {
        itemId: match?.id ?? "",
        description: match?.name ?? line.name,
        itemCode: match?.code ?? line.itemCode,
        quantity: String(line.quantity),
        uom: match?.uom?.symbol ?? line.uom,
        wastagePct: String(line.wastagePct),
      };
    });

    setForm({
      code: PALE_ALE_RECIPE.code,
      name: PALE_ALE_RECIPE.name,
      productCode: PALE_ALE_RECIPE.productCode,
      productName: PALE_ALE_RECIPE.productName,
      batchSize: String(PALE_ALE_RECIPE.batchSize),
      uom: PALE_ALE_RECIPE.uom,
      version: PALE_ALE_RECIPE.version,
      notes: PALE_ALE_RECIPE.notes,
    });
    setMaterials(lines);

    const linked = lines.filter((l) => l.itemId).length;
    if (items.length === 0) {
      toast.message("Pale Ale template loaded", {
        description: "No warehouse items yet — run seed or create brewing raw materials, then re-apply to link BOM lines.",
      });
    } else if (linked < lines.length) {
      toast.message("Pale Ale template loaded", {
        description: `Linked ${linked}/${lines.length} BOM lines to warehouse items. Select items for any remaining lines.`,
      });
    } else {
      toast.success("Pale Ale (example) BOM loaded with warehouse items linked");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim() || !form.productName.trim() || !form.batchSize) {
      toast.error("Code, name, product, and batch size are required");
      return;
    }
    const batchSizeNum = Number(form.batchSize);
    if (!Number.isFinite(batchSizeNum) || batchSizeNum <= 0) {
      toast.error("Batch size must be greater than 0");
      return;
    }

    const validMaterials = materials.filter(
      (line) => line.description.trim() && Number(line.quantity) > 0
    );
    if (!validMaterials.length) {
      toast.error("Bill of Materials needs at least one line with quantity greater than 0");
      return;
    }

    if (items.length > 0) {
      const missingItem = validMaterials.find((line) => !line.itemId);
      if (missingItem) {
        toast.error("Select a warehouse item for each BOM line (needed for stock availability checks)");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/production/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          batchSize: batchSizeNum,
          productCode: form.productCode || undefined,
          notes: form.notes || undefined,
          materials: validMaterials.map((line) => ({
            itemId: line.itemId || undefined,
            itemCode: line.itemCode || undefined,
            description: line.description,
            quantity: Number(line.quantity),
            uom: line.uom || "KG",
            wastagePct: line.wastagePct ? Number(line.wastagePct) : 0,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to create recipe");
        return;
      }
      toast.success("Recipe created");
      router.push(`/production/recipes/${json.data.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Recipe"
        description="Create a production recipe with a Bill of Materials linked to warehouse items"
        actions={
          <Button variant="outline" asChild>
            <Link href="/production/recipes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">Recipe Details</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={applyPaleAleTemplate}
              disabled={submitting || itemsLoading}
            >
              <FlaskConical className="h-4 w-4 mr-1" />
              Load Pale Ale (example)
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="recipe-code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="recipe-code"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  disabled={submitting}
                  placeholder="e.g. RECIPE-PA"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="recipe-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="recipe-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  disabled={submitting}
                  placeholder="e.g. Pale Ale (example)"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="product-code">Product Code</Label>
                <Input
                  id="product-code"
                  value={form.productCode}
                  onChange={(e) => setForm((p) => ({ ...p, productCode: e.target.value }))}
                  disabled={submitting}
                  placeholder="e.g. FG-PALE-ALE"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="product-name">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="product-name"
                  value={form.productName}
                  onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="batch-size">
                  Batch Size <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="batch-size"
                  inputMode="decimal"
                  value={form.batchSize}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, batchSize: sanitizeDecimalInput(e.target.value) }))
                  }
                  disabled={submitting}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="batch-uom">UOM</Label>
                <Input
                  id="batch-uom"
                  value={form.uom}
                  onChange={(e) => setForm((p) => ({ ...p, uom: e.target.value }))}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="recipe-version">Version</Label>
                <Input
                  id="recipe-version"
                  value={form.version}
                  onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="recipe-notes">Notes</Label>
              <Input
                id="recipe-notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                disabled={submitting}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Bill of Materials</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Quantities are per batch. Prefer warehouse items so Start-batch stock checks work.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMaterials((prev) => [...prev, { ...EMPTY_MATERIAL }])}
              disabled={submitting}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Line
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {materials.map((line, idx) => {
              const stock = currentStock(line.itemId);
              return (
                <div key={idx} className="grid gap-3 sm:grid-cols-12 items-end border rounded-md p-3">
                  <div className="sm:col-span-4 space-y-1">
                    <Label>
                      Item <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={line.itemId || "__none"}
                      onValueChange={(v) => selectItem(idx, v === "__none" ? "" : v)}
                      disabled={itemsLoading || submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse item" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">
                          {items.length === 0 ? "No items — enter description" : "Select an item…"}
                        </SelectItem>
                        {items.map((it) => (
                          <SelectItem key={it.id} value={it.id}>
                            {it.code} — {it.name} (Stock:{" "}
                            {(it.stockBalances ?? []).reduce((s, b) => s + (b.quantity || 0), 0)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label>Description</Label>
                    <Input
                      value={line.description}
                      onChange={(e) => updateMaterial(idx, { description: e.target.value })}
                      disabled={submitting}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Qty per batch</Label>
                    <Input
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(e) =>
                        updateMaterial(idx, { quantity: sanitizeDecimalInput(e.target.value) })
                      }
                      disabled={submitting}
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-1">
                    <Label>UOM</Label>
                    <Input
                      value={line.uom}
                      onChange={(e) => updateMaterial(idx, { uom: e.target.value })}
                      disabled={submitting}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Wastage %</Label>
                    <Input
                      inputMode="decimal"
                      value={line.wastagePct}
                      onChange={(e) =>
                        updateMaterial(idx, { wastagePct: sanitizeDecimalInput(e.target.value) })
                      }
                      disabled={submitting}
                    />
                  </div>
                  <div className="sm:col-span-12 flex items-center justify-between">
                    {line.itemId ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        Current stock:{" "}
                        <span className={stock <= 0 ? "text-red-500 font-medium" : "text-green-600 font-medium"}>
                          {stock.toLocaleString()}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600">
                        Link a warehouse item for stock availability checks
                      </span>
                    )}
                    {materials.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive ml-auto"
                        onClick={() => removeMaterial(idx)}
                        disabled={submitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
          {submitting && <LoadingSpinner className="mr-2" />}
          Create Recipe
        </Button>
      </form>
    </div>
  );
}
