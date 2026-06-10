"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TestTube } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STAGES = [
  { value: "PITCHING", label: "Pitching" },
  { value: "PRIMARY", label: "Primary Fermentation" },
  { value: "SECONDARY", label: "Secondary / Conditioning" },
  { value: "MATURATION", label: "Maturation" },
  { value: "LAGERING", label: "Lagering" },
  { value: "TRANSFER_TO_BBT", label: "Transfer to BBT" },
  { value: "FINAL", label: "Final Check" },
];

export default function NewUnitankAnalysisPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tankNumber: "",
    brand: "",
    stage: "",
    sampleDate: new Date().toISOString().split("T")[0],
    sampleTime: new Date().toTimeString().slice(0, 5),
    alc: "",
    oe: "",
    pg: "",
    ph: "",
    fg: "",
    col: "",
    bu: "",
    adf: "",
    analystId: "",
    batchId: "",
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function num(v: string) { return v !== "" ? parseFloat(v) : undefined; }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tankNumber || !form.brand || !form.stage || !form.sampleDate) {
      toast.error("Tank number, brand, stage, and sample date are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/lab/unitank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tankNumber: form.tankNumber,
          brand: form.brand,
          stage: form.stage,
          sampleDate: form.sampleDate,
          sampleTime: form.sampleTime || undefined,
          alc: num(form.alc),
          oe: num(form.oe),
          pg: num(form.pg),
          ph: num(form.ph),
          fg: num(form.fg),
          col: num(form.col),
          bu: num(form.bu),
          adf: num(form.adf),
          batchId: form.batchId || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to save");
      toast.success("Unitank analysis saved");
      router.push("/qc/lab/unitank");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="New Unitank Analysis"
        description="Record fermentation tank sample results"
        
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Sample Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>UT Number *</Label>
              <Input value={form.tankNumber} onChange={(e) => set("tankNumber", e.target.value)} placeholder="e.g. UT01" required />
            </div>
            <div className="space-y-1">
              <Label>Brand *</Label>
              <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. EASTL Lager" required />
            </div>
            <div className="space-y-1">
              <Label>Stage *</Label>
              <Select value={form.stage} onValueChange={(v) => set("stage", v)} required>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>{STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
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
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: "alc", label: "ALC %", step: "0.01" },
              { key: "oe", label: "O.E. (°P)", step: "0.01" },
              { key: "pg", label: "P.G. (°P)", step: "0.001" },
              { key: "ph", label: "pH", step: "0.01" },
              { key: "fg", label: "F.G. (°P)", step: "0.001" },
              { key: "col", label: "Colour (EBC)", step: "0.1" },
              { key: "bu", label: "BU (IBU)", step: "0.1" },
              { key: "adf", label: "ADF %", step: "0.1" },
            ].map(({ key, label, step }) => (
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
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Analysis"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
