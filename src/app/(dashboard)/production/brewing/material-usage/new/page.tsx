"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Package } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  { value: "MASH_TUN", label: "Mash Tun" },
  { value: "WORT_KETTLE", label: "Wort Kettle" },
];

const DEFAULT_ITEMS: Record<string, Array<{ itemName: string; uom: string }>> = {
  MASH_TUN: [
    { itemName: "Pale Malt", uom: "KG" },
    { itemName: "Maize Grit / Adjunct", uom: "KG" },
    { itemName: "Brewing Salts", uom: "G" },
    { itemName: "Mash Enzymes", uom: "ML" },
    { itemName: "Caustic Mash", uom: "ML" },
  ],
  WORT_KETTLE: [
    { itemName: "Hops (Bittering)", uom: "KG" },
    { itemName: "Hops (Aroma)", uom: "KG" },
    { itemName: "Irish Moss / Koppafloc", uom: "G" },
    { itemName: "Yeast Nutrient", uom: "G" },
    { itemName: "Caramel / Colour Additive", uom: "ML" },
  ],
};

interface ItemRow {
  section: string;
  itemName: string;
  uom: string;
  targetQty: string;
  actualQty: string;
  additionalQty: string;
  recommendedQty: string;
  notes: string;
}

export default function NewBrewMaterialUsagePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [brewDate, setBrewDate] = useState(new Date().toISOString().split("T")[0]);
  const [brand, setBrand] = useState("");
  const [batchId, setBatchId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>(() =>
    Object.entries(DEFAULT_ITEMS).flatMap(([section, defaults]) =>
      defaults.map((d) => ({ section, ...d, targetQty: "", actualQty: "", additionalQty: "", recommendedQty: "", notes: "" }))
    )
  );

  function updateItem(idx: number, field: keyof ItemRow, value: string) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  function addItem(section: string) {
    setItems((prev) => [...prev, { section, itemName: "", uom: "KG", targetQty: "", actualQty: "", additionalQty: "", recommendedQty: "", notes: "" }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brewDate || !brand) { toast.error("Brew date and brand are required"); return; }
    const filled = items.filter((i) => i.itemName.trim());
    if (filled.length === 0) { toast.error("At least one item is required"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/brewing/material-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brewDate,
          brand,
          batchId: batchId || undefined,
          notes: notes || undefined,
          items: filled.map((item, i) => ({
            ...item,
            targetQty: item.targetQty ? parseFloat(item.targetQty) : undefined,
            actualQty: item.actualQty ? parseFloat(item.actualQty) : undefined,
            additionalQty: item.additionalQty ? parseFloat(item.additionalQty) : undefined,
            recommendedQty: item.recommendedQty ? parseFloat(item.recommendedQty) : undefined,
            sortOrder: i,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to save");
      toast.success("Material usage record saved");
      router.push("/production/brewing/material-usage");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="New Material Usage Record"
        description="Brewhouse Material Usage Sheet — ingredients per brew"
        
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Brew Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Brew Date *</Label>
              <Input type="date" value={brewDate} onChange={(e) => setBrewDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Brand / Product *</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. EASTL Lager" required />
            </div>
            <div className="space-y-1">
              <Label>Batch ID (optional)</Label>
              <Input value={batchId} onChange={(e) => setBatchId(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {SECTIONS.map((section) => {
          const sectionItems = items.map((item, i) => ({ item, i })).filter(({ item }) => item.section === section.value);
          return (
            <Card key={section.value}>
              <CardHeader><CardTitle className="text-base">{section.label}</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground text-xs">
                        <th className="pb-2 pr-2 w-48">Item / Ingredient</th>
                        <th className="pb-2 pr-2 w-16">UOM</th>
                        <th className="pb-2 pr-2 w-24">Target</th>
                        <th className="pb-2 pr-2 w-24">Actual</th>
                        <th className="pb-2 pr-2 w-24">Additional</th>
                        <th className="pb-2 pr-2 w-24">Recommended</th>
                        <th className="pb-2 pr-2">Notes</th>
                        <th className="pb-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionItems.map(({ item, i }) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1 pr-2"><Input value={item.itemName} onChange={(e) => updateItem(i, "itemName", e.target.value)} className="h-8" /></td>
                          <td className="py-1 pr-2"><Input value={item.uom} onChange={(e) => updateItem(i, "uom", e.target.value)} className="h-8" /></td>
                          <td className="py-1 pr-2"><Input type="number" step="0.001" value={item.targetQty} onChange={(e) => updateItem(i, "targetQty", e.target.value)} className="h-8" /></td>
                          <td className="py-1 pr-2"><Input type="number" step="0.001" value={item.actualQty} onChange={(e) => updateItem(i, "actualQty", e.target.value)} className="h-8 font-medium" /></td>
                          <td className="py-1 pr-2"><Input type="number" step="0.001" value={item.additionalQty} onChange={(e) => updateItem(i, "additionalQty", e.target.value)} className="h-8" /></td>
                          <td className="py-1 pr-2"><Input type="number" step="0.001" value={item.recommendedQty} onChange={(e) => updateItem(i, "recommendedQty", e.target.value)} className="h-8 text-muted-foreground" /></td>
                          <td className="py-1 pr-2"><Input value={item.notes} onChange={(e) => updateItem(i, "notes", e.target.value)} className="h-8" /></td>
                          <td className="py-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => addItem(section.value)}>
                  <Plus className="mr-1 h-3 w-3" /> Add Item
                </Button>
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Material Usage"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
