"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  { value: "MASH_CONVERSION", label: "Mash Conversion" },
  { value: "LAUTERING", label: "Lautering" },
  { value: "WORT_BOILING", label: "Wort Boiling" },
  { value: "COOLING_AERATION", label: "Cooling & Aeration" },
  { value: "PITCHING", label: "Yeast Pitching" },
];

const DEFAULT_ACTIVITIES: Record<string, Array<{ activity: string; unit: string }>> = {
  MASH_CONVERSION: [
    { activity: "Mash Temperature", unit: "°C" },
    { activity: "Mash pH", unit: "pH" },
    { activity: "Mash Time", unit: "min" },
    { activity: "Starch Conversion Test", unit: "" },
    { activity: "Mash Out Temperature", unit: "°C" },
  ],
  LAUTERING: [
    { activity: "First Runnings OE", unit: "°P" },
    { activity: "First Runnings pH", unit: "pH" },
    { activity: "Last Runnings OE", unit: "°P" },
    { activity: "Last Runnings pH", unit: "pH" },
    { activity: "Sparge Water Temperature", unit: "°C" },
    { activity: "Total Volume Collected", unit: "HL" },
  ],
  WORT_BOILING: [
    { activity: "Pre-boil OE", unit: "°P" },
    { activity: "Pre-boil pH", unit: "pH" },
    { activity: "Boil Time", unit: "min" },
    { activity: "Post-boil OE", unit: "°P" },
    { activity: "Post-boil pH", unit: "pH" },
    { activity: "Post-boil Volume", unit: "HL" },
  ],
  COOLING_AERATION: [
    { activity: "Wort Outlet Temperature", unit: "°C" },
    { activity: "Pre-aeration OE", unit: "°P" },
    { activity: "Pre-aeration pH", unit: "pH" },
    { activity: "Colour", unit: "EBC" },
    { activity: "Bitterness Units", unit: "BU" },
    { activity: "Volume to Fermenter", unit: "HL" },
  ],
  PITCHING: [
    { activity: "Pitching Temperature", unit: "°C" },
    { activity: "Yeast Volume", unit: "L" },
    { activity: "Post-pitching OE", unit: "°P" },
    { activity: "Post-pitching pH", unit: "pH" },
  ],
};

interface ActivityRow {
  section: string;
  activity: string;
  unit: string;
  target: string;
  startTime: string;
  endTime: string;
  actual: string;
  reasonOutSpec: string;
}

function emptyActivity(section = "MASH_CONVERSION"): ActivityRow {
  return { section, activity: "", unit: "", target: "", startTime: "", endTime: "", actual: "", reasonOutSpec: "" };
}

export default function NewBrewingSessionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [brewDate, setBrewDate] = useState(new Date().toISOString().split("T")[0]);
  const [brand, setBrand] = useState("");
  const [brewNumber, setBrewNumber] = useState("");
  const [batchId, setBatchId] = useState("");
  const [notes, setNotes] = useState("");
  const [activities, setActivities] = useState<ActivityRow[]>(() =>
    Object.entries(DEFAULT_ACTIVITIES).flatMap(([section, acts]) =>
      acts.map((a) => ({ ...emptyActivity(section), activity: a.activity, unit: a.unit }))
    )
  );

  function updateActivity(idx: number, field: keyof ActivityRow, value: string) {
    setActivities((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  }

  function addActivity() {
    setActivities((prev) => [...prev, emptyActivity()]);
  }

  function removeActivity(idx: number) {
    setActivities((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brewDate || !brand) { toast.error("Brew date and brand are required"); return; }
    const filled = activities.filter((a) => a.activity.trim());
    if (filled.length === 0) { toast.error("At least one activity is required"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/brewing/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brewDate,
          brand,
          brewNumber: brewNumber || undefined,
          batchId: batchId || undefined,
          notes: notes || undefined,
          activities: filled.map((a, i) => ({ ...a, sortOrder: i })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to save");
      toast.success("Brewing session saved");
      router.push(`/production/brewing/sessions/${data.data.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const grouped = SECTIONS.map((s) => ({
    ...s,
    rows: activities.map((a, i) => ({ a, i })).filter(({ a }) => a.section === s.value),
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="New Brewing Session"
        description="Mashing Sheet — record brew day process activities"
        
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Brew Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Brew Date *</Label>
              <Input type="date" value={brewDate} onChange={(e) => setBrewDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Brand / Product *</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. EASTL Lager" required />
            </div>
            <div className="space-y-1">
              <Label>Brew Number</Label>
              <Input value={brewNumber} onChange={(e) => setBrewNumber(e.target.value)} placeholder="e.g. B001" />
            </div>
            <div className="space-y-1">
              <Label>Batch ID (optional)</Label>
              <Input value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="Link to production batch" />
            </div>
          </CardContent>
        </Card>

        {grouped.map((section) => (
          <Card key={section.value}>
            <CardHeader>
              <CardTitle className="text-base">{section.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-2 w-44">Activity / Parameter</th>
                      <th className="pb-2 pr-2 w-16">Unit</th>
                      <th className="pb-2 pr-2 w-24">Target</th>
                      <th className="pb-2 pr-2 w-24">Start Time</th>
                      <th className="pb-2 pr-2 w-24">End Time</th>
                      <th className="pb-2 pr-2 w-24">Actual</th>
                      <th className="pb-2 pr-2">Reason Out of Spec</th>
                      <th className="pb-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map(({ a, i }) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1 pr-2">
                          <Input
                            value={a.activity}
                            onChange={(e) => updateActivity(i, "activity", e.target.value)}
                            className="h-8"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <Input
                            value={a.unit}
                            onChange={(e) => updateActivity(i, "unit", e.target.value)}
                            className="h-8"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <Input
                            value={a.target}
                            onChange={(e) => updateActivity(i, "target", e.target.value)}
                            className="h-8"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <Input
                            type="time"
                            value={a.startTime}
                            onChange={(e) => updateActivity(i, "startTime", e.target.value)}
                            className="h-8"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <Input
                            type="time"
                            value={a.endTime}
                            onChange={(e) => updateActivity(i, "endTime", e.target.value)}
                            className="h-8"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <Input
                            value={a.actual}
                            onChange={(e) => updateActivity(i, "actual", e.target.value)}
                            className="h-8 font-medium"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <Input
                            value={a.reasonOutSpec}
                            onChange={(e) => updateActivity(i, "reasonOutSpec", e.target.value)}
                            className="h-8 text-red-600"
                            placeholder="If out of spec..."
                          />
                        </td>
                        <td className="py-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeActivity(i)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setActivities((prev) => [...prev, emptyActivity(section.value)])}
              >
                <Plus className="mr-1 h-3 w-3" /> Add Row
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Brewing Session"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
