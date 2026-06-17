"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Beaker } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewBBTAnalysisPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bbtNumber: "",
    fromTankNumber: "",
    brand: "",
    sampleDate: new Date().toISOString().split("T")[0],
    sampleTime: new Date().toTimeString().slice(0, 5),
    pg: "", og: "", alc: "", haze: "", ph: "", col: "",
    dissolvedO2: "", bitterness: "", bbtTemp: "", adf: "",
    batchId: "", notes: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function num(v: string) { return v !== "" ? parseFloat(v) : undefined; }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bbtNumber || !form.brand || !form.sampleDate) {
      toast.error("BBT number, brand, and sample date are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/lab/bbt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bbtNumber: form.bbtNumber,
          fromTankNumber: form.fromTankNumber || undefined,
          brand: form.brand,
          sampleDate: form.sampleDate,
          sampleTime: form.sampleTime || undefined,
          pg: num(form.pg), og: num(form.og), alc: num(form.alc),
          haze: num(form.haze), ph: num(form.ph), col: num(form.col),
          dissolvedO2: num(form.dissolvedO2), bitterness: num(form.bitterness),
          bbtTemp: num(form.bbtTemp), adf: num(form.adf),
          batchId: form.batchId || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to save");
      toast.success("BBT analysis saved");
      router.push("/qc/lab/bbt");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const analysisFields = [
    { key: "pg", label: "P.G. (°P)", step: "0.001" },
    { key: "og", label: "O.G. (°P)", step: "0.001" },
    { key: "alc", label: "ALC %V/V", step: "0.01" },
    { key: "haze", label: "Haze (NTU/EBC)", step: "0.01" },
    { key: "ph", label: "pH", step: "0.01" },
    { key: "col", label: "Colour (EBC)", step: "0.1" },
    { key: "dissolvedO2", label: "D.O. (ppb)", step: "0.1" },
    { key: "bitterness", label: "Bitterness (BU)", step: "0.1" },
    { key: "bbtTemp", label: "BBT Temp (°C)", step: "0.1" },
    { key: "adf", label: "ADF %", step: "0.1" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="New BBT Analysis"
        description="Bright Beer Tank analysis record"
        
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Sample Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>BBT Number *</Label>
              <Input value={form.bbtNumber} onChange={(e) => set("bbtNumber", e.target.value)} placeholder="e.g. BBT01" required />
            </div>
            <div className="space-y-1">
              <Label>Ex-UT (From Tank)</Label>
              <Input value={form.fromTankNumber} onChange={(e) => set("fromTankNumber", e.target.value)} placeholder="e.g. UT02" />
            </div>
            <div className="space-y-1">
              <Label>Brand *</Label>
              <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. EASTL Lager" required />
            </div>
            <div className="space-y-1">
              <Label>Sample Date *</Label>
              <Input type="date" value={form.sampleDate} onChange={(e) => set("sampleDate", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Sample Time</Label>
              <Input type="time" value={form.sampleTime} onChange={(e) => set("sampleTime", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Batch ID (optional)</Label>
              <Input value={form.batchId} onChange={(e) => set("batchId", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Analysis Results</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {analysisFields.map(({ key, label, step }) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  type="number"
                  step={step}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => set(key, e.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="mt-1" />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save BBT Analysis"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
