"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Printer, Save, Send } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface Driver {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  employee?: { id: string; fullName: string; employeeNumber: string } | null;
}

interface EntryRow {
  id: string;
  vehicleId: string;
  driverId: string | null;
  vehicleStatus: string;
  tripId: string | null;
  destination: string | null;
  departureTime: string | null;
  expectedReturn: string | null;
  odometerOut: number | null;
  fuelLevel: string | null;
  remarks: string | null;
  vehicle: Vehicle;
  driver: Driver | null;
}

interface Report {
  id: string;
  reference: string;
  reportDate: string;
  status: string;
  totalVehicles: number;
  onTrip: number;
  present: number;
  maintenance: number;
  offsite: number;
  other: number;
  notes: string | null;
  submittedAt: string | null;
  entries: EntryRow[];
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

export default function DailyMovementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState<EditableEntry[]>([]);
  const [notes, setNotes] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/transport/daily-movement/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const r: Report = d.data;
        setReport(r);
        setNotes(r.notes ?? "");
        setEntries(
          r.entries.map((e) => ({
            vehicleId: e.vehicleId,
            vehicleStatus: e.vehicleStatus,
            driverId: e.driver?.employee?.fullName ?? ([e.driver?.firstName, e.driver?.lastName].filter(Boolean).join(" ")) ?? "",
            destination: e.destination ?? "",
            departureTime: e.departureTime ? e.departureTime.slice(0, 16) : "",
            expectedReturn: e.expectedReturn ? e.expectedReturn.slice(0, 16) : "",
            odometerOut: e.odometerOut != null ? String(e.odometerOut) : "",
            fuelLevel: e.fuelLevel ?? "",
            remarks: e.remarks ?? "",
          }))
        );
      })
      .catch(() => toast.error("Failed to load report"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const updateEntry = (idx: number, field: keyof EditableEntry, value: string) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/transport/daily-movement/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "Failed to save");
        return;
      }
      toast.success("Report saved");
      load();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Save first, then submit
    setSaving(true);
    try {
      const saveRes = await fetch(`/api/transport/daily-movement/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      if (!saveRes.ok) {
        const d = await saveRes.json();
        toast.error(d.error ?? "Failed to save before submitting");
        return;
      }
    } finally {
      setSaving(false);
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/transport/daily-movement/${id}/submit`, {
        method: "POST",
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "Failed to submit");
        return;
      }
      toast.success("Report submitted successfully");
      load();
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!report) return <div className="p-8 text-center text-muted-foreground">Report not found.</div>;

  const isDraft = report.status === "DRAFT";
  const counts = isDraft
    ? calcCounts(entries)
    : { onTrip: report.onTrip, present: report.present, maintenance: report.maintenance, offsite: report.offsite, other: report.other };

  return (
    <div>
      <PageHeader
        title={`Daily Movement — ${format(new Date(report.reportDate), "dd MMM yyyy")}`}
        description={`Reference: ${report.reference}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/transport/daily-movement">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Link>
            </Button>
            {isDraft ? (
              <>
                <PermissionGuard require="transport:daily-movement:update">
                  <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </PermissionGuard>
                <PermissionGuard require="transport:daily-movement:update">
                  <Button size="sm" onClick={handleSubmit} disabled={saving || submitting}>
                    <Send className="h-4 w-4 mr-1" />
                    {submitting ? "Submitting..." : "Submit Report"}
                  </Button>
                </PermissionGuard>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            )}
          </div>
        }
      />

      {/* Print-only header */}
      <div className="print-only mb-6">
        <h1 className="text-xl font-bold text-center">DAILY TRUCK MOVEMENT REPORT</h1>
        <div className="flex justify-between text-sm mt-2">
          <span>Reference: {report.reference}</span>
          <span>Date: {format(new Date(report.reportDate), "dd MMMM yyyy")}</span>
        </div>
        <div className="flex gap-6 mt-2 text-sm">
          <span>On Trip: {counts.onTrip}</span>
          <span>Present: {counts.present}</span>
          <span>Maintenance: {counts.maintenance}</span>
          <span>Offsite: {counts.offsite}</span>
          <span>Other: {counts.other}</span>
          <span>Total: {report.totalVehicles}</span>
        </div>
      </div>

      {/* Summary bar */}
      <div className="no-print flex flex-wrap gap-3 mb-6">
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
          <span className="text-2xl font-bold">{report.totalVehicles}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg px-4 py-2">
          {report.status === "SUBMITTED" ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Submitted</Badge>
          ) : (
            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Draft</Badge>
          )}
        </div>
      </div>

      {/* Vehicle entries table */}
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
                  const rawEntry = report.entries[idx];
                  const vehicle = rawEntry?.vehicle;
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
                        {isDraft ? (
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
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(entry.vehicleStatus)}`}>
                            {VEHICLE_STATUSES.find((s) => s.value === entry.vehicleStatus)?.label ?? entry.vehicleStatus}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {isDraft ? (
                          <Input
                            className="h-8 w-36 text-xs"
                            value={entry.driverId}
                            onChange={(e) => updateEntry(idx, "driverId", e.target.value)}
                            placeholder="Driver name"
                          />
                        ) : (
                          <span className="text-muted-foreground">{entry.driverId || "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {isDraft ? (
                          <Input
                            className="h-8 w-36 text-xs"
                            value={entry.destination}
                            onChange={(e) => updateEntry(idx, "destination", e.target.value)}
                            placeholder={showTrip ? "Destination" : "—"}
                            disabled={!showTrip}
                          />
                        ) : (
                          <span className="text-muted-foreground">{entry.destination || "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {isDraft ? (
                          <input
                            type="datetime-local"
                            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs w-40 disabled:opacity-40"
                            value={entry.departureTime}
                            onChange={(e) => updateEntry(idx, "departureTime", e.target.value)}
                            disabled={entry.vehicleStatus !== "ON_TRIP"}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            {entry.departureTime ? format(new Date(entry.departureTime), "dd MMM HH:mm") : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {isDraft ? (
                          <input
                            type="datetime-local"
                            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs w-40 disabled:opacity-40"
                            value={entry.expectedReturn}
                            onChange={(e) => updateEntry(idx, "expectedReturn", e.target.value)}
                            disabled={entry.vehicleStatus !== "ON_TRIP"}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            {entry.expectedReturn ? format(new Date(entry.expectedReturn), "dd MMM HH:mm") : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {isDraft ? (
                          <Input
                            type="number"
                            className="h-8 w-28 text-xs"
                            value={entry.odometerOut}
                            onChange={(e) => updateEntry(idx, "odometerOut", e.target.value)}
                            placeholder="km"
                            min="0"
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            {entry.odometerOut ? `${entry.odometerOut} km` : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {isDraft ? (
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
                        ) : (
                          <span className="text-muted-foreground">
                            {FUEL_LEVELS.find((f) => f.value === entry.fuelLevel)?.label ?? entry.fuelLevel ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isDraft ? (
                          <Input
                            className="h-8 w-40 text-xs"
                            value={entry.remarks}
                            onChange={(e) => updateEntry(idx, "remarks", e.target.value)}
                            placeholder="Remarks"
                          />
                        ) : (
                          <span className="text-muted-foreground">{entry.remarks || "—"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {isDraft ? (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or observations..."
              rows={3}
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {report.notes ?? "No notes recorded."}
            </p>
          )}
          {report.submittedAt && (
            <p className="mt-3 text-xs text-muted-foreground">
              Submitted: {format(new Date(report.submittedAt), "dd MMM yyyy HH:mm")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
