"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Microscope } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SampleRow {
  sampleType: string;
  sampleSource: string;
  brand: string;
  desiredDetection: string;
  incubation: string;
  media: string;
  result: string;
  isInSpec: string;
  actual: string;
  remarks: string;
}

const SAMPLE_TYPES = ["UNITANK", "BBT", "BRIGHT_BEER", "WORT", "PACKAGING", "YEAST", "WATER", "FINISHED_GOODS"];
const RESULT_OPTIONS = ["NEGATIVE (-ve)", "POSITIVE (+ve)", "CONTAMINATED"];

function emptyRow(): SampleRow {
  return { sampleType: "UNITANK", sampleSource: "", brand: "", desiredDetection: "", incubation: "", media: "", result: "", isInSpec: "", actual: "", remarks: "" };
}

export default function NewMicroReportPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [samples, setSamples] = useState<SampleRow[]>([emptyRow()]);

  function updateSample(idx: number, field: keyof SampleRow, value: string) {
    setSamples((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function addSample() { setSamples((prev) => [...prev, emptyRow()]); }
  function removeSample(idx: number) { setSamples((prev) => prev.filter((_, i) => i !== idx)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reportDate) { toast.error("Report date is required"); return; }
    const filled = samples.filter((s) => s.sampleType);
    if (filled.length === 0) { toast.error("At least one sample is required"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/lab/micro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate,
          notes: notes || undefined,
          samples: filled.map((s, i) => ({
            sampleType: s.sampleType,
            sampleSource: s.sampleSource || undefined,
            brand: s.brand || undefined,
            desiredDetection: s.desiredDetection || undefined,
            incubation: s.incubation || undefined,
            media: s.media || undefined,
            result: s.result || undefined,
            isInSpec: s.isInSpec === "yes" ? true : s.isInSpec === "no" ? false : undefined,
            actual: s.actual || undefined,
            remarks: s.remarks || undefined,
            sortOrder: i,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to save");
      toast.success("Micro report saved");
      router.push("/qc/lab/micro");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="New Daily Micro Report"
        description="Record microbiology test results for all samples"
        
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="pt-6 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Report Date *</Label>
              <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Micro Samples</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="pb-2 pr-2 w-24">Sample Type</th>
                    <th className="pb-2 pr-2 w-20">Source (UT/BBT)</th>
                    <th className="pb-2 pr-2 w-20">Brand</th>
                    <th className="pb-2 pr-2 w-28">Desired Detection</th>
                    <th className="pb-2 pr-2 w-24">Incubation</th>
                    <th className="pb-2 pr-2 w-24">Media</th>
                    <th className="pb-2 pr-2 w-28">Result</th>
                    <th className="pb-2 pr-2 w-20">In Spec?</th>
                    <th className="pb-2 pr-2 w-20">Actual</th>
                    <th className="pb-2 pr-2">Remarks</th>
                    <th className="pb-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1 pr-2">
                        <Select value={s.sampleType} onValueChange={(v) => updateSample(i, "sampleType", v)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{SAMPLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="py-1 pr-2"><Input value={s.sampleSource} onChange={(e) => updateSample(i, "sampleSource", e.target.value)} className="h-8" placeholder="UT01" /></td>
                      <td className="py-1 pr-2"><Input value={s.brand} onChange={(e) => updateSample(i, "brand", e.target.value)} className="h-8" /></td>
                      <td className="py-1 pr-2"><Input value={s.desiredDetection} onChange={(e) => updateSample(i, "desiredDetection", e.target.value)} className="h-8" placeholder="Wild Yeast" /></td>
                      <td className="py-1 pr-2"><Input value={s.incubation} onChange={(e) => updateSample(i, "incubation", e.target.value)} className="h-8" placeholder="25°C / 48h" /></td>
                      <td className="py-1 pr-2"><Input value={s.media} onChange={(e) => updateSample(i, "media", e.target.value)} className="h-8" placeholder="WLN" /></td>
                      <td className="py-1 pr-2">
                        <Select value={s.result} onValueChange={(v) => updateSample(i, "result", v)}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{RESULT_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="py-1 pr-2">
                        <Select value={s.isInSpec} onValueChange={(v) => updateSample(i, "isInSpec", v)}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="-" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes ✓</SelectItem>
                            <SelectItem value="no">No ✗</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-1 pr-2"><Input value={s.actual} onChange={(e) => updateSample(i, "actual", e.target.value)} className="h-8" /></td>
                      <td className="py-1 pr-2"><Input value={s.remarks} onChange={(e) => updateSample(i, "remarks", e.target.value)} className="h-8" /></td>
                      <td className="py-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeSample(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addSample}>
              <Plus className="mr-1 h-3 w-3" /> Add Sample
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
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Micro Report"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
