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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VehicleOption {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
}

export default function NewIncidentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);

  const [form, setForm] = useState({
    vehicleId: "",
    tripId: "",
    incidentType: "",
    incidentDate: "",
    location: "",
    description: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    fetch("/api/vehicles?pageSize=200")
      .then((r) => r.json())
      .then((d) => setVehicles(d.data ?? []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicleId) { toast.error("Vehicle is required"); return; }
    if (!form.incidentType) { toast.error("Incident type is required"); return; }
    if (!form.incidentDate) { toast.error("Incident date is required"); return; }
    if (!form.description.trim()) { toast.error("Description is required"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: form.vehicleId,
          tripId: form.tripId.trim() || undefined,
          incidentType: form.incidentType,
          incidentDate: form.incidentDate,
          location: form.location.trim() || undefined,
          description: form.description.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to report incident"); return; }
      toast.success("Incident reported");
      router.push(`/transport/incidents/${json.data?.id ?? json.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Report Incident"
        description="Report a fleet incident for investigation"
        actions={
          <Button variant="outline" asChild>
            <Link href="/transport/incidents">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incident Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>
                Vehicle <span className="text-destructive">*</span>
              </Label>
              <Select value={form.vehicleId || "__none"} onValueChange={(v) => set("vehicleId", v === "__none" ? "" : v)} disabled={submitting}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select vehicle</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plateNumber} — {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tripId">Trip Reference (optional)</Label>
              <Input
                id="tripId"
                value={form.tripId}
                onChange={(e) => set("tripId", e.target.value)}
                placeholder="Trip ID if related to a trip"
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">Leave blank if not linked to a specific trip.</p>
            </div>

            <div className="space-y-1">
              <Label>
                Incident Type <span className="text-destructive">*</span>
              </Label>
              <Select value={form.incidentType || "__none"} onValueChange={(v) => set("incidentType", v === "__none" ? "" : v)} disabled={submitting}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select type</SelectItem>
                  <SelectItem value="BREAKDOWN">Breakdown</SelectItem>
                  <SelectItem value="ACCIDENT">Accident</SelectItem>
                  <SelectItem value="FINE">Fine</SelectItem>
                  <SelectItem value="THEFT">Theft</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="incidentDate">
                Incident Date &amp; Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="incidentDate"
                type="datetime-local"
                value={form.incidentDate}
                onChange={(e) => set("incidentDate", e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Mombasa Road, km 45"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe what happened..."
                rows={4}
                disabled={submitting}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting && <LoadingSpinner className="mr-2" />}
            Report Incident
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/transport/incidents">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
