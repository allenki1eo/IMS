"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEFAULT_PARAMS = [
  { paramName: "O.E.", unit: "°P" },
  { paramName: "ALC", unit: "% v/v" },
  { paramName: "A.E.", unit: "°P" },
  { paramName: "BU", unit: "IBU" },
  { paramName: "COLOUR", unit: "EBC" },
  { paramName: "CO2", unit: "vol" },
  { paramName: "pH", unit: "" },
  { paramName: "HAZE", unit: "NTU/EBC" },
  { paramName: "TIPO", unit: "" },
  { paramName: "Redpost R/PU", unit: "" },
  { paramName: "Code", unit: "" },
  { paramName: "Volatile Acid", unit: "" },
  { paramName: "Organoleptic", unit: "" },
];

interface ParamRow {
  paramName: string;
  unit: string;
  target: string;
  rangeMin: string;
  rangeMax: string;
  notes: string;
}

export default function NewProductSpecPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [brand, setBrand] = useState("");
  const [productCode, setProductCode] = useState("");
  const [version, setVersion] = useState("1");
  const [notes, setNotes] = useState("");
  const [params, setParams] = useState<ParamRow[]>(
    DEFAULT_PARAMS.map((p) => ({ ...p, target: "", rangeMin: "", rangeMax: "", notes: "" }))
  );

  function updateParam(idx: number, field: keyof ParamRow, value: string) {
    setParams((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  function addParam() {
    setParams((prev) => [...prev, { paramName: "", unit: "", target: "", rangeMin: "", rangeMax: "", notes: "" }]);
  }

  function removeParam(idx: number) {
    setParams((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brand) { toast.error("Brand is required"); return; }
    const filled = params.filter((p) => p.paramName.trim());
    if (filled.length === 0) { toast.error("At least one parameter is required"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/lab/specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          productCode: productCode || undefined,
          version,
          notes: notes || undefined,
          parameters: filled.map((p, i) => ({ ...p, sortOrder: i })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to save");
      toast.success("Product spec saved");
      router.push("/qc/lab/specs");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="New Product Spec Sheet"
        description="Define quality specifications for a brand"
        
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Product Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Brand *</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. EASTL Lager" required />
            </div>
            <div className="space-y-1">
              <Label>Product Code</Label>
              <Input value={productCode} onChange={(e) => setProductCode(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Version</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Parameters</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="pb-2 pr-2 w-40">Parameter</th>
                  <th className="pb-2 pr-2 w-20">Unit</th>
                  <th className="pb-2 pr-2 w-28">Target</th>
                  <th className="pb-2 pr-2 w-24">Range Min</th>
                  <th className="pb-2 pr-2 w-24">Range Max</th>
                  <th className="pb-2 pr-2">Notes</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {params.map((p, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1 pr-2"><Input value={p.paramName} onChange={(e) => updateParam(i, "paramName", e.target.value)} className="h-8" /></td>
                    <td className="py-1 pr-2"><Input value={p.unit} onChange={(e) => updateParam(i, "unit", e.target.value)} className="h-8" /></td>
                    <td className="py-1 pr-2"><Input value={p.target} onChange={(e) => updateParam(i, "target", e.target.value)} className="h-8" /></td>
                    <td className="py-1 pr-2"><Input value={p.rangeMin} onChange={(e) => updateParam(i, "rangeMin", e.target.value)} className="h-8" /></td>
                    <td className="py-1 pr-2"><Input value={p.rangeMax} onChange={(e) => updateParam(i, "rangeMax", e.target.value)} className="h-8" /></td>
                    <td className="py-1 pr-2"><Input value={p.notes} onChange={(e) => updateParam(i, "notes", e.target.value)} className="h-8" /></td>
                    <td className="py-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeParam(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addParam}>
              <Plus className="mr-1 h-3 w-3" /> Add Parameter
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Spec Sheet"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
