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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LINE_TYPES } from "../../_components/production-ui";

interface LineOption { id: string; code: string; name: string }
interface RecipeOption { id: string; code: string; name: string; productName: string; batchSize: number; uom: string }

export default function NewProductionBatchPage() {
  const router = useRouter();
  const [lines, setLines] = useState<LineOption[]>([]);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    lineId: "",
    recipeId: "",
    batchType: "BREWING",
    productCode: "",
    productName: "",
    plannedQty: "",
    uom: "L",
    plannedStart: "",
    plannedEnd: "",
    notes: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lineId = params.get("lineId") ?? "";
    const recipeId = params.get("recipeId") ?? "";
    if (lineId || recipeId) setForm((prev) => ({ ...prev, lineId, recipeId }));
    Promise.all([
      fetch("/api/production/lines?status=ACTIVE&pageSize=200").then((r) => r.json()),
      fetch("/api/production/recipes?status=ACTIVE&pageSize=200").then((r) => r.json()),
    ])
      .then(([linesData, recipesData]) => {
        setLines(linesData.data ?? []);
        setRecipes(recipesData.data ?? []);
      })
      .catch(() => toast.error("Failed to load form options"));
  }, []);

  useEffect(() => {
    const recipe = recipes.find((r) => r.id === form.recipeId);
    if (!recipe) return;
    setForm((prev) => ({
      ...prev,
      productName: prev.productName || recipe.productName,
      plannedQty: prev.plannedQty || String(recipe.batchSize),
      uom: prev.uom || recipe.uom,
    }));
  }, [form.recipeId, recipes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.recipeId && (!form.productName.trim() || !form.plannedQty)) {
      toast.error("Choose a recipe or enter product and planned quantity");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/production/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId: form.lineId || undefined,
          recipeId: form.recipeId || undefined,
          batchType: form.batchType,
          productCode: form.productCode || undefined,
          productName: form.productName || undefined,
          plannedQty: form.plannedQty ? Number(form.plannedQty) : undefined,
          uom: form.uom || "L",
          plannedStart: form.plannedStart || undefined,
          plannedEnd: form.plannedEnd || undefined,
          notes: form.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create batch"); return; }
      toast.success("Production batch planned");
      router.push(`/production/batches/${json.data.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="New Production Batch" description="Plan a brewing or production run" actions={<Button variant="outline" asChild><Link href="/production/batches"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link></Button>} />
      <Card className="max-w-3xl">
        <CardHeader><CardTitle className="text-base">Batch Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Production Line</Label>
                <Select value={form.lineId || "__none"} onValueChange={(v) => setForm((p) => ({ ...p, lineId: v === "__none" ? "" : v }))} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none">No line</SelectItem>{lines.map((line) => <SelectItem key={line.id} value={line.id}>{line.code} - {line.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Recipe</Label>
                <Select value={form.recipeId || "__none"} onValueChange={(v) => setForm((p) => ({ ...p, recipeId: v === "__none" ? "" : v }))} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Select recipe" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none">No recipe</SelectItem>{recipes.map((recipe) => <SelectItem key={recipe.id} value={recipe.id}>{recipe.code} - {recipe.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Batch Type</Label>
                <Select value={form.batchType} onValueChange={(v) => setForm((p) => ({ ...p, batchType: v }))} disabled={submitting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LINE_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Product Code</Label><Input value={form.productCode} onChange={(e) => setForm((p) => ({ ...p, productCode: e.target.value }))} disabled={submitting} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-1"><Label>Product Name</Label><Input value={form.productName} onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))} disabled={submitting} /></div>
              <div className="space-y-1"><Label>Planned Qty</Label><Input type="number" min="0" step="0.01" value={form.plannedQty} onChange={(e) => setForm((p) => ({ ...p, plannedQty: e.target.value }))} disabled={submitting} /></div>
              <div className="space-y-1"><Label>UOM</Label><Input value={form.uom} onChange={(e) => setForm((p) => ({ ...p, uom: e.target.value }))} disabled={submitting} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1"><Label>Planned Start</Label><Input type="date" value={form.plannedStart} onChange={(e) => setForm((p) => ({ ...p, plannedStart: e.target.value }))} disabled={submitting} /></div>
              <div className="space-y-1"><Label>Planned End</Label><Input type="date" value={form.plannedEnd} onChange={(e) => setForm((p) => ({ ...p, plannedEnd: e.target.value }))} disabled={submitting} /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} disabled={submitting} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none" /></div>
            <div className="flex gap-2 pt-2"><Button type="submit" disabled={submitting}>{submitting && <LoadingSpinner className="mr-2" />}Plan Batch</Button><Button type="button" variant="outline" asChild><Link href="/production/batches">Cancel</Link></Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

