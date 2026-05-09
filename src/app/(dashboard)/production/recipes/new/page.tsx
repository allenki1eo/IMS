"use client";

import { useState } from "react";
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

interface MaterialForm {
  description: string;
  itemCode: string;
  quantity: string;
  uom: string;
  wastagePct: string;
}

const EMPTY_MATERIAL: MaterialForm = { description: "", itemCode: "", quantity: "1", uom: "KG", wastagePct: "0" };

export default function NewProductionRecipePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", productCode: "", productName: "", batchSize: "", uom: "L", version: "1", notes: "" });
  const [materials, setMaterials] = useState<MaterialForm[]>([{ ...EMPTY_MATERIAL }]);

  function updateMaterial(index: number, patch: Partial<MaterialForm>) {
    setMaterials((prev) => prev.map((line, i) => i === index ? { ...line, ...patch } : line));
  }

  function removeMaterial(index: number) {
    setMaterials((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim() || !form.productName.trim() || !form.batchSize) {
      toast.error("Code, name, product, and batch size are required");
      return;
    }
    const validMaterials = materials.filter((line) => line.description.trim() && Number(line.quantity) > 0);
    if (!validMaterials.length) {
      toast.error("At least one material is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/production/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          batchSize: Number(form.batchSize),
          productCode: form.productCode || undefined,
          notes: form.notes || undefined,
          materials: validMaterials.map((line) => ({
            description: line.description,
            itemCode: line.itemCode || undefined,
            quantity: Number(line.quantity),
            uom: line.uom || "KG",
            wastagePct: line.wastagePct ? Number(line.wastagePct) : 0,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create recipe"); return; }
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
      <PageHeader title="New Recipe" description="Create a production recipe and material list" actions={<Button variant="outline" asChild><Link href="/production/recipes"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link></Button>} />
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Recipe Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} disabled={submitting} /></div>
              <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} disabled={submitting} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1"><Label>Product Code</Label><Input value={form.productCode} onChange={(e) => setForm((p) => ({ ...p, productCode: e.target.value }))} disabled={submitting} /></div>
              <div className="space-y-1"><Label>Product Name</Label><Input value={form.productName} onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))} disabled={submitting} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1"><Label>Batch Size</Label><Input type="number" min="0" step="0.01" value={form.batchSize} onChange={(e) => setForm((p) => ({ ...p, batchSize: e.target.value }))} disabled={submitting} /></div>
              <div className="space-y-1"><Label>UOM</Label><Input value={form.uom} onChange={(e) => setForm((p) => ({ ...p, uom: e.target.value }))} disabled={submitting} /></div>
              <div className="space-y-1"><Label>Version</Label><Input value={form.version} onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))} disabled={submitting} /></div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} disabled={submitting} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Materials</CardTitle><Button type="button" size="sm" onClick={() => setMaterials((prev) => [...prev, { ...EMPTY_MATERIAL }])} disabled={submitting}><Plus className="h-4 w-4 mr-1" />Add Material</Button></CardHeader>
          <CardContent className="space-y-3">
            {materials.map((line, index) => (
              <div key={index} className="grid gap-3 rounded-md border p-3 lg:grid-cols-[1fr_140px_120px_100px_120px_40px]">
                <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={line.description} onChange={(e) => updateMaterial(index, { description: e.target.value })} disabled={submitting} /></div>
                <div className="space-y-1"><Label className="text-xs">Item Code</Label><Input value={line.itemCode} onChange={(e) => updateMaterial(index, { itemCode: e.target.value })} disabled={submitting} /></div>
                <div className="space-y-1"><Label className="text-xs">Quantity</Label><Input type="number" min="0" step="0.01" value={line.quantity} onChange={(e) => updateMaterial(index, { quantity: e.target.value })} disabled={submitting} /></div>
                <div className="space-y-1"><Label className="text-xs">UOM</Label><Input value={line.uom} onChange={(e) => updateMaterial(index, { uom: e.target.value })} disabled={submitting} /></div>
                <div className="space-y-1"><Label className="text-xs">Wastage %</Label><Input type="number" min="0" step="0.01" value={line.wastagePct} onChange={(e) => updateMaterial(index, { wastagePct: e.target.value })} disabled={submitting} /></div>
                <div className="flex items-end"><Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive" onClick={() => removeMaterial(index)} disabled={submitting || materials.length === 1}><Trash2 className="h-4 w-4" /></Button></div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="flex gap-2"><Button type="submit" disabled={submitting}>{submitting && <LoadingSpinner className="mr-2" />}Create Recipe</Button><Button type="button" variant="outline" asChild><Link href="/production/recipes">Cancel</Link></Button></div>
      </form>
    </div>
  );
}

