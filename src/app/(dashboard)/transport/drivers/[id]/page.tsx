"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface TripRow {
  id: string;
  reference: string;
  vehicle?: { plateNumber: string } | null;
  origin: string;
  destination: string;
  status: string;
  scheduledDeparture: string | null;
}

interface AssignmentRow {
  id: string;
  vehicle?: { plateNumber: string; make: string; model: string } | null;
  assignedAt: string;
  status: string;
}

interface Driver {
  id: string;
  isAvailable: boolean;
  status: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  licenseNumber: string | null;
  licenseClass: string | null;
  licenseExpiry: string | null;
  medicalExpiry: string | null;
  notes: string | null;
  employee?: {
    id: string;
    fullName: string;
    employeeNumber: string;
    email: string | null;
    phone: string | null;
  } | null;
  currentAssignment?: AssignmentRow | null;
  trips?: TripRow[];
}

function ExpiryDate({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground">—</span>;
  const days = differenceInDays(new Date(date), new Date());
  const formatted = format(new Date(date), "dd MMM yyyy");
  if (days <= 30) {
    return (
      <span className={`font-medium ${days < 0 ? "text-red-600" : "text-amber-600"}`}>
        {formatted} {days < 0 ? "(Expired)" : `(${days}d left)`}
      </span>
    );
  }
  return <span>{formatted}</span>;
}

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  // Inline edit
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    licenseNumber: "",
    licenseClass: "",
    licenseExpiry: "",
    medicalExpiry: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchDriver = useCallback(async () => {
    try {
      const res = await fetch(`/api/drivers/${id}`);
      const json = await res.json();
      const d = json.data ?? json;
      setDriver(d);
      setEditForm({
        firstName: d.firstName ?? "",
        lastName: d.lastName ?? "",
        phone: d.phone ?? "",
        email: d.email ?? "",
        licenseNumber: d.licenseNumber ?? "",
        licenseClass: d.licenseClass ?? "",
        licenseExpiry: d.licenseExpiry ? d.licenseExpiry.substring(0, 10) : "",
        medicalExpiry: d.medicalExpiry ? d.medicalExpiry.substring(0, 10) : "",
        notes: d.notes ?? "",
      });
    } catch {
      toast.error("Failed to load driver");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDriver(); }, [fetchDriver]);

  async function toggleAvailability() {
    if (!driver) return;
    setTogglingAvailability(true);
    try {
      const res = await fetch(`/api/drivers/${id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !driver.isAvailable }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update availability"); return; }
      toast.success(`Driver marked as ${!driver.isAvailable ? "available" : "unavailable"}`);
      fetchDriver();
    } catch {
      toast.error("Network error");
    } finally {
      setTogglingAvailability(false);
    }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/drivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editForm.firstName || undefined,
          lastName: editForm.lastName || undefined,
          phone: editForm.phone || undefined,
          email: editForm.email || undefined,
          licenseNumber: editForm.licenseNumber || undefined,
          licenseClass: editForm.licenseClass || undefined,
          licenseExpiry: editForm.licenseExpiry || undefined,
          medicalExpiry: editForm.medicalExpiry || undefined,
          notes: editForm.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to save changes"); return; }
      toast.success("Driver updated");
      setEditing(false);
      fetchDriver();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!driver) return <div className="text-muted-foreground">Driver not found.</div>;

  const emp = driver.employee;
  const displayName = emp?.fullName ??
    ([driver.firstName, driver.lastName].filter(Boolean).join(" ") || "Driver Details");

  return (
    <div>
      <PageHeader
        title={displayName}
        description={emp?.employeeNumber ? `Employee No: ${emp.employeeNumber}` : undefined}
        actions={
          <Button variant="outline" asChild>
            <Link href="/transport/drivers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="max-w-4xl space-y-6">
        {/* Availability + Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Status & Availability</CardTitle>
            <div className="flex items-center gap-2">
              <StatusBadge status={driver.status} />
              <Badge variant={driver.isAvailable ? "success" : "destructive"}>
                {driver.isAvailable ? "Available" : "Unavailable"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <PermissionGuard require="transport:driver:update">
              <Button
                variant={driver.isAvailable ? "destructive" : "default"}
                size="sm"
                onClick={toggleAvailability}
                disabled={togglingAvailability}
              >
                {togglingAvailability && <LoadingSpinner className="mr-2" />}
                {driver.isAvailable ? "Mark Unavailable" : "Mark Available"}
              </Button>
            </PermissionGuard>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {emp ? "Employee Information" : "Driver Information"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emp ? (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground font-medium">Employee No</dt>
                  <dd className="mt-0.5"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{emp.employeeNumber}</code></dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Full Name</dt>
                  <dd className="mt-0.5 font-medium">{emp.fullName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Email</dt>
                  <dd className="mt-0.5">{emp.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Phone</dt>
                  <dd className="mt-0.5">{emp.phone ?? "—"}</dd>
                </div>
              </dl>
            ) : (
              !editing ? (
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground font-medium">First Name</dt>
                    <dd className="mt-0.5 font-medium">{driver.firstName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground font-medium">Last Name</dt>
                    <dd className="mt-0.5 font-medium">{driver.lastName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground font-medium">Phone</dt>
                    <dd className="mt-0.5">{driver.phone ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground font-medium">Email</dt>
                    <dd className="mt-0.5">{driver.email ?? "—"}</dd>
                  </div>
                </dl>
              ) : null
            )}
          </CardContent>
        </Card>

        {/* Current Assignment */}
        {driver.currentAssignment && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-base text-blue-700">Current Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">
                    {driver.currentAssignment.vehicle?.plateNumber} —{" "}
                    {driver.currentAssignment.vehicle?.make} {driver.currentAssignment.vehicle?.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Since {format(new Date(driver.currentAssignment.assignedAt), "dd MMM yyyy HH:mm")}
                  </p>
                </div>
                <StatusBadge status={driver.currentAssignment.status} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* License & Medical */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">License & Medical Details</CardTitle>
            <PermissionGuard require="transport:driver:update">
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                  <Button size="sm" onClick={saveEdit} disabled={saving}>
                    {saving && <LoadingSpinner className="mr-2" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </PermissionGuard>
          </CardHeader>
          <CardContent>
            {!editing ? (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground font-medium">License Number</dt>
                  <dd className="mt-0.5 font-mono">{driver.licenseNumber ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">License Class</dt>
                  <dd className="mt-0.5">
                    {driver.licenseClass ? <Badge variant="secondary">{driver.licenseClass}</Badge> : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">License Expiry</dt>
                  <dd className="mt-0.5"><ExpiryDate date={driver.licenseExpiry} /></dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Medical Expiry</dt>
                  <dd className="mt-0.5"><ExpiryDate date={driver.medicalExpiry} /></dd>
                </div>
                {driver.notes && (
                  <div className="col-span-2 sm:col-span-3">
                    <dt className="text-muted-foreground font-medium">Notes</dt>
                    <dd className="mt-0.5">{driver.notes}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!emp && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="editFirstName">First Name</Label>
                      <Input id="editFirstName" value={editForm.firstName} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} disabled={saving} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="editLastName">Last Name</Label>
                      <Input id="editLastName" value={editForm.lastName} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} disabled={saving} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="editPhone">Phone</Label>
                      <Input id="editPhone" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} disabled={saving} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="editEmail">Email</Label>
                      <Input id="editEmail" type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} disabled={saving} />
                    </div>
                    <div className="sm:col-span-2"><Separator /></div>
                  </>
                )}
                <div className="space-y-1">
                  <Label htmlFor="licNum">License Number</Label>
                  <Input id="licNum" value={editForm.licenseNumber} onChange={(e) => setEditForm((p) => ({ ...p, licenseNumber: e.target.value }))} disabled={saving} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="licClass">License Class</Label>
                  <Input id="licClass" value={editForm.licenseClass} onChange={(e) => setEditForm((p) => ({ ...p, licenseClass: e.target.value }))} disabled={saving} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="licExp">License Expiry</Label>
                  <Input id="licExp" type="date" value={editForm.licenseExpiry} onChange={(e) => setEditForm((p) => ({ ...p, licenseExpiry: e.target.value }))} disabled={saving} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="medExp">Medical Expiry</Label>
                  <Input id="medExp" type="date" value={editForm.medicalExpiry} onChange={(e) => setEditForm((p) => ({ ...p, medicalExpiry: e.target.value }))} disabled={saving} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} disabled={saving} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Trips */}
        <div>
          <h2 className="text-base font-semibold mb-3">Recent Trips</h2>
          {(driver.trips ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No trips recorded for this driver.</p>
          ) : (
            <div className="space-y-2">
              {(driver.trips ?? []).map((t) => (
                <Card key={t.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <Link href={`/transport/trips/${t.id}`} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:underline">
                          {t.reference}
                        </Link>
                        <p className="text-sm mt-1">{t.origin} → {t.destination}</p>
                        {t.vehicle && (
                          <p className="text-xs text-muted-foreground">{t.vehicle.plateNumber}</p>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <StatusBadge status={t.status} />
                        {t.scheduledDeparture && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.scheduledDeparture), "dd MMM yyyy")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
