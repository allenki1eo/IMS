"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Send, Save } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VEHICLE_STATUSES = [
  { value: "PRESENT", label: "Present" },
  { value: "ON_TRIP", label: "On Trip" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OFFSITE", label: "Offsite" },
  { value: "OTHER", label: "Other" },
];

const FUEL_LEVELS = [
  { value: "FULL", label: "Full" },
  { value: "THREE_QUARTER", label: "¾" },
  { value: "HALF", label: "½" },
  { value: "QUARTER", label: "¼" },
  { value: "LOW", label: "Low" },
];

function statusColor(status: string) {
  switch (status) {
    case "ON_TRIP": return "bg-blue-100 text-blue-700";
    case "PRESENT": return "bg-emerald-100 text-emerald-700";
    case "MAINTENANCE": return "bg-orange-100 text-orange-700";
    case "OFFSITE": return "bg-purple-100 text-purple-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  vehicleType: string;
}

interface ActiveTrip {
  id: string;
  vehicleId: string;
  driverId: string | null;
  destination: string;
  actualDeparture: string | null;
  scheduledArrival: string | null;
}

interface EditableEntry {
  vehicleId: string;
  vehicleStatus: string;
  driverId: string;
  destination: string;
  departureTime: string;
  expectedReturn: string;
  odometerOut: string;
  fuelLevel: string;
  remarks: string;
}

function calcCounts(entries: EditableEntry[]) {
  let onTrip = 0, present = 0, maintenance = 0, offsite = 0, other = 0;
  for (const e of entries) {
    if (e.vehicleStatus === "ON_TRIP") onTrip++;
    else if (e.vehicleStatus === "PRESENT") present++;
    else if (e.vehicleStatus === "MAINTENANCE") maintenance++;
    else if (e.vehicleStatus === "OFFSITE") offsite++;
    else other++;
  }
  return { onTrip, present, maintenance, offsite, other };
}

export default function NewDailyMovementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [entries, setEntries] = useState<EditableEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const today = new Date();

  useEffect(() => {
    setLoading(true);
    fetch("/api/transport/daily-movement/today")
      .then((r) => r.json())
      .then((d) => {
        const result = d.data;
        // If there's already a report for today, redirect to it
        if (result?.report) {
          router.replace(`/transport/daily-movement/${result.report.id}`);
          return;
        }

        const vehicleList: Vehicle[] = result?.vehicles ?? [];
        const activeTrips: ActiveTrip[] = result?.activeTrips ?? [];

        setVehicles(vehicleList);

        // Build entries, pre-populating ON_TRIP for active trips
        const tripMap = new Map<string, ActiveTrip>();
        for (const trip of activeTrips) {
          tripMap.set(trip.vehicleId, trip);
        }

        setEntries(
          vehicleList.map((v) => {
            const trip = tripMap.get(v.id);
            if (trip) {
              return {
                vehicleId: v.id,
                vehicleStatus: "ON_TRIP",
                driverId: "",
                destination: trip.destination ?? "",
                departureTime: trip.actualDeparture ? trip.actualDeparture.slice(0, 16) : "",
                expectedReturn: trip.scheduledArrival ? trip.scheduledArrival.slice(0, 16) : "",
                odometerOut: "",
                fuelLevel: "",
                remarks: "",
              };
            }
            return {
              vehicleId: v.id,
              vehicleStatus: "PRESENT",
              driverId: "",
              destination: "",
              departureTime: "",
              expectedReturn: "",
              odometerOut: "",
              fuelLevel: "",
              remarks: "",
            };
          })
        );
      })
      .catch(() => toast.error("Failed to load vehicle data"))
      .finally(() => setLoading(false));
  }, [router]);

  const updateEntry = (idx: number, field: keyof EditableEntry, value: string) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const buildPayload = () => ({
    reportDate: today.toISOString(),
    notes: notes || null,
    entries: entries.map((e) => ({
      vehicleId: e.vehicleId,
      vehicleStatus: e.vehicleStatus,
      driverId: e.driverId || null,
      destination: e.destination || null,
      departureTime: e.departureTime || null,
      expectedReturn: e.expectedReturn || null,
      odometerOut: e.odometerOut ? parseFloat(e.odometerOut) : null,
      fuelLevel: e.fuelLevel || null,
      remarks: e.remarks || null,
    })),
  });

  const handleSave = async () => {
    if (entries.length === 0) {
      toast.error("No vehicles to record");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/transport/daily-movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "Failed to save");
        return;
      }
      toast.success("Report saved as draft");
      router.push(`/transport/daily-movement/${d.data.id}`);
    } catch {
      toast.error("Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSubmit = async () => {
    if (entries.length === 0) {
      toast.error("No vehicles to record");
      return;
    }
    setSaving(true);
    try {
      // Create first
      const res = await fetch("/api/transport/daily-movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "Failed to save");
        return;
      }
      const reportId = d.data.id;

      // Then submit
      const submitRes = await fetch(`/api/transport/daily-movement/${reportId}/submit`, {
        method: "POST",
      });
      if (!submitRes.ok) {
        const sd = await submitRes.json();
        toast.error(sd.error ?? "Created but failed to submit");
        router.push(`/transport/daily-movement/${reportId}`);
        return;
      }
      toast.success("Report submitted successfully");
      router.push(`/transport/daily-movement/${reportId}`);
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  const counts = calcCounts(entries);

  return (
    <div>
      <PageHeader
        title={`Daily Movement — ${format(today, "dd MMM yyyy")}`}
        description="Record the fleet status for today"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/transport/daily-movement">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Link>
            </Button>
            <PermissionGuard require="transport:daily-movement:create">
              <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Saving..." : "Save Draft"}
              </Button>
            </PermissionGuard>
            <PermissionGuard require="transport:daily-movement:create">
              <Button size="sm" onClick={handleSaveAndSubmit} disabled={saving}>
                <Send className="h-4 w-4 mr-1" />
                {saving ? "Saving..." : "Save & Submit"}
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="text-xs text-blue-500 font-medium uppercase tracking-wide">On Trip</span>
          <span className="text-2xl font-bold text-blue-600">{counts.onTrip}</span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
          <span className="text-xs text-emerald-500 font-medium uppercase tracking-wide">Present</span>
          <span className="text-2xl font-bold text-emerald-600">{counts.present}</span>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
          <span className="text-xs text-orange-500 font-medium uppercase tracking-wide">Maintenance</span>
          <span className="text-2xl font-bold text-orange-500">{counts.maintenance}</span>
        </div>
        <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
          <span className="text-xs text-purple-500 font-medium uppercase tracking-wide">Offsite</span>
          <span className="text-2xl font-bold text-purple-600">{counts.offsite}</span>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Other</span>
          <span className="text-2xl font-bold text-gray-600">{counts.other}</span>
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2 ml-auto">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total</span>
          <span className="text-2xl font-bold">{vehicles.length}</span>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No active vehicles found</p>
          <p className="text-sm mt-1">Add vehicles to the fleet before recording a movement sheet.</p>
        </div>
      ) : (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fleet Status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 sticky top-0 z-10">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Vehicle</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Driver</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Destination</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Departure</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Exp. Return</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Odometer Out</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Fuel Level</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry, idx) => {
                    const vehicle = vehicles[idx];
                    const showTrip = entry.vehicleStatus === "ON_TRIP" || entry.vehicleStatus === "OFFSITE";

                    return (
                      <tr key={entry.vehicleId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div>
                            <p className="font-semibold">{vehicle?.plateNumber ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{vehicle?.make} {vehicle?.model}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <Select
                            value={entry.vehicleStatus}
                            onValueChange={(v) => updateEntry(idx, "vehicleStatus", v)}
                          >
                            <SelectTrigger className="h-8 w-36 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VEHICLE_STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <Input
                            className="h-8 w-36 text-xs"
                            value={entry.driverId}
                            onChange={(e) => updateEntry(idx, "driverId", e.target.value)}
                            placeholder="Driver name"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <Input
                            className="h-8 w-36 text-xs"
                            value={entry.destination}
                            onChange={(e) => updateEntry(idx, "destination", e.target.value)}
                            placeholder={showTrip ? "Destination" : "—"}
                            disabled={!showTrip}
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <input
                            type="datetime-local"
                            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs w-40 disabled:opacity-40"
                            value={entry.departureTime}
                            onChange={(e) => updateEntry(idx, "departureTime", e.target.value)}
                            disabled={entry.vehicleStatus !== "ON_TRIP"}
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <input
                            type="datetime-local"
                            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs w-40 disabled:opacity-40"
                            value={entry.expectedReturn}
                            onChange={(e) => updateEntry(idx, "expectedReturn", e.target.value)}
                            disabled={entry.vehicleStatus !== "ON_TRIP"}
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <Input
                            type="number"
                            className="h-8 w-28 text-xs"
                            value={entry.odometerOut}
                            onChange={(e) => updateEntry(idx, "odometerOut", e.target.value)}
                            placeholder="km"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <Select
                            value={entry.fuelLevel || "__none__"}
                            onValueChange={(v) => updateEntry(idx, "fuelLevel", v === "__none__" ? "" : v)}
                          >
                            <SelectTrigger className="h-8 w-24 text-xs">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">—</SelectItem>
                              {FUEL_LEVELS.map((f) => (
                                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            className="h-8 w-40 text-xs"
                            value={entry.remarks}
                            onChange={(e) => updateEntry(idx, "remarks", e.target.value)}
                            placeholder="Remarks"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes or observations..."
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
