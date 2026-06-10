"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Droplets } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VESSELS = [
  { value: "WORT_COOLER", label: "Wort Cooler" },
  { value: "TRANSFER_LINE", label: "Transfer Line" },
  { value: "LAUTER_TUN", label: "Lauter Tun" },
  { value: "MASH_TUN", label: "Mash Tun" },
  { value: "HOLDING_TANK", label: "Holding Tank" },
  { value: "WORT_KETTLE", label: "Wort Kettle" },
  { value: "WHIRLPOOL", label: "Whirlpool" },
  { value: "FERMENTER", label: "Fermenter / Unitank" },
  { value: "BBT", label: "Bright Beer Tank (BBT)" },
  { value: "YEAST_PITCHING_LINE", label: "Yeast Pitching Line" },
  { value: "HOSE_PIPE", label: "Hose Pipe" },
];

export default function NewCIPRecordPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vessel: "",
    cipDate: new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    causticTemp: "",
    causticHL: "",
    causticTimeMin: "",
    causticCondition: "",
    pushWaterHL: "",
    nitricAcidPct: "",
    nitricHL: "",
    nitricTimeMin: "",
    rinsingWaterHL: "",
    rinsingTimeMin: "",
    carryOver: "",
    operatorSign: "",
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function num(v: string) { return v !== "" ? parseFloat(v) : undefined; }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vessel || !form.cipDate) { toast.error("Vessel and CIP date are required"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/brewing/cip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vessel: form.vessel,
          cipDate: form.cipDate,
          startTime: form.startTime || undefined,
          endTime: form.endTime || undefined,
          causticTemp: num(form.causticTemp),
          causticHL: num(form.causticHL),
          causticTimeMin: num(form.causticTimeMin),
          causticCondition: form.causticCondition || undefined,
          pushWaterHL: num(form.pushWaterHL),
          nitricAcidPct: num(form.nitricAcidPct),
          nitricHL: num(form.nitricHL),
          nitricTimeMin: num(form.nitricTimeMin),
          rinsingWaterHL: num(form.rinsingWaterHL),
          rinsingTimeMin: num(form.rinsingTimeMin),
          carryOver: form.carryOver || undefined,
          operatorSign: form.operatorSign || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to save");
      toast.success("CIP record saved");
      router.push("/production/brewing/cip");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="New CIP Record"
        description="Clean In Place — record cleaning parameters for each vessel"
        
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>General</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1 col-span-2">
              <Label>Vessel *</Label>
              <Select value={form.vessel} onValueChange={(v) => set("vessel", v)} required>
                <SelectTrigger><SelectValue placeholder="Select vessel" /></SelectTrigger>
                <SelectContent>{VESSELS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>CIP Date *</Label>
              <Input type="date" value={form.cipDate} onChange={(e) => set("cipDate", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Start Time</Label>
              <Input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End Time</Label>
              <Input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Caustic Phase</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Temp (°C)</Label>
              <Input type="number" step="0.1" value={form.causticTemp} onChange={(e) => set("causticTemp", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Volume (HL)</Label>
              <Input type="number" step="0.1" value={form.causticHL} onChange={(e) => set("causticHL", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Time (min)</Label>
              <Input type="number" step="1" value={form.causticTimeMin} onChange={(e) => set("causticTimeMin", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Condition</Label>
              <Input value={form.causticCondition} onChange={(e) => set("causticCondition", e.target.value)} placeholder="e.g. 2% NaOH" />
            </div>
            <div className="space-y-1">
              <Label>Push Water (HL)</Label>
              <Input type="number" step="0.1" value={form.pushWaterHL} onChange={(e) => set("pushWaterHL", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Nitric Acid Phase</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Acid % (25%)</Label>
              <Input type="number" step="0.1" value={form.nitricAcidPct} onChange={(e) => set("nitricAcidPct", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Volume (HL)</Label>
              <Input type="number" step="0.1" value={form.nitricHL} onChange={(e) => set("nitricHL", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Time (min)</Label>
              <Input type="number" step="1" value={form.nitricTimeMin} onChange={(e) => set("nitricTimeMin", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rinsing & Completion</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Rinsing Water (HL)</Label>
              <Input type="number" step="0.1" value={form.rinsingWaterHL} onChange={(e) => set("rinsingWaterHL", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Rinsing Time (min)</Label>
              <Input type="number" step="1" value={form.rinsingTimeMin} onChange={(e) => set("rinsingTimeMin", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Carry Over</Label>
              <Input value={form.carryOver} onChange={(e) => set("carryOver", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Operator Signature</Label>
              <Input value={form.operatorSign} onChange={(e) => set("operatorSign", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="mt-1" />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save CIP Record"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
