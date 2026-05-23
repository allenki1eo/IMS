"use client";

import { useState } from "react";
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

export default function NewProductionLinePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", lineType: "BREWING", location: "", capacityPerDay: "", uom: "L" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/production/lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, capacityPerDay: form.capacityPerDay ? Number(form.capacityPerDay) : undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create line"); return; }
      toast.success("Production line created");
      router.push(`/production/lines/${json.data.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="New Production Line" description="Create a brewing, packaging, or processing line" actions={<Button variant="outline" asChild><Link href="/production/lines"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link></Button>} />
      <Card className="max-w-2xl">
        <CardHeader><CardTitle className="text-base">Line Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1"><Label htmlFor="code">Code</Label><Input id="code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} disabled={submitting} /></div>
              <div className="space-y-1"><Label htmlFor="name">Name</Label><Input id="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} disabled={submitting} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.lineType} onValueChange={(v) => setForm((p) => ({ ...p, lineType: v }))} disabled={submitting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LINE_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label htmlFor="location">Location</Label><Input id="location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} disabled={submitting} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1"><Label htmlFor="capacityPerDay">Capacity / Day</Label><Input id="capacityPerDay" type="number" min="0.01" step="0.01" value={form.capacityPerDay} onChange={(e) => setForm((p) => ({ ...p, capacityPerDay: e.target.value }))} disabled={submitting} /></div>
              <div className="space-y-1"><Label htmlFor="uom">UOM</Label><Input id="uom" value={form.uom} onChange={(e) => setForm((p) => ({ ...p, uom: e.target.value }))} disabled={submitting} /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>{submitting && <LoadingSpinner className="mr-2" />}Create Line</Button>
              <Button type="button" variant="outline" asChild><Link href="/production/lines">Cancel</Link></Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

