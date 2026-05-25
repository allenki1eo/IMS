"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface VehicleDocument {
  id: string;
  documentType: string;
  documentNumber: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
}

interface AssignmentRow {
  id: string;
  driver?: { firstName?: string | null; lastName?: string | null; employee?: { fullName: string } | null } | null;
  assignedAt: string;
  returnedAt: string | null;
  status: string;
}

interface TripRow {
  id: string;
  reference: string;
  origin: string;
  destination: string;
  status: string;
  scheduledDeparture: string | null;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number | null;
  vehicleType: string;
  usageType: string;
  fuelType: string | null;
  capacity: number | null;
  fuelTankCapacity: number | null;
  color: string | null;
  chassisNumber: string | null;
  engineNumber: string | null;
  odometer: number | null;
  insuranceExpiry: string | null;
  roadWorthyExpiry: string | null;
  nextServiceDate: string | null;
  lastRefuelAt: string | null;
  nextRefuelAt: string | null;
  averageConsumption: number | null;
  notes: string | null;
  status: string;
  documents?: VehicleDocument[];
  assignments?: AssignmentRow[];
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

type TabKey = "details" | "documents" | "history";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("details");

  // Odometer update
  const [odometerValue, setOdometerValue] = useState("");
  const [savingOdo, setSavingOdo] = useState(false);

  // Status change
  const [newStatus, setNewStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Add document dialog
  const [docDialog, setDocDialog] = useState(false);
  const [docForm, setDocForm] = useState({
    documentType: "",
    documentNumber: "",
    issuedAt: "",
    expiresAt: "",
    notes: "",
  });
  const [savingDoc, setSavingDoc] = useState(false);

  const fetchVehicle = useCallback(async () => {
    try {
      const res = await fetch(`/api/vehicles/${id}`);
      const json = await res.json();
      const v = json.data ?? json;
      setVehicle(v);
      setNewStatus(v.status ?? "");
      setOdometerValue(String(v.odometer ?? ""));
    } catch {
      toast.error("Failed to load vehicle");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchVehicle(); }, [fetchVehicle]);

  async function saveOdometer() {
    if (!odometerValue) return;
    setSavingOdo(true);
    try {
      const res = await fetch(`/api/vehicles/${id}/odometer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ odometer: Number(odometerValue) }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update odometer"); return; }
      toast.success("Odometer updated");
      fetchVehicle();
    } catch {
      toast.error("Network error");
    } finally {
      setSavingOdo(false);
    }
  }

  async function saveStatus() {
    if (!newStatus) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/vehicles/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update status"); return; }
      toast.success("Status updated");
      fetchVehicle();
    } catch {
      toast.error("Network error");
    } finally {
      setSavingStatus(false);
    }
  }

  async function addDocument() {
    if (!docForm.documentType) { toast.error("Document type is required"); return; }
    setSavingDoc(true);
    try {
      const res = await fetch(`/api/vehicles/${id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: docForm.documentType,
          documentNumber: docForm.documentNumber || undefined,
          issuedAt: docForm.issuedAt || undefined,
          expiresAt: docForm.expiresAt || undefined,
          notes: docForm.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to add document"); return; }
      toast.success("Document added");
      setDocDialog(false);
      setDocForm({ documentType: "", documentNumber: "", issuedAt: "", expiresAt: "", notes: "" });
      fetchVehicle();
    } catch {
      toast.error("Network error");
    } finally {
      setSavingDoc(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!vehicle) return <div className="text-muted-foreground">Vehicle not found.</div>;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "documents", label: "Documents" },
    { key: "history", label: "History" },
  ];

  return (
    <div>
      <PageHeader
        title={`${vehicle.plateNumber} — ${vehicle.make} ${vehicle.model}`}
        description={`${vehicle.vehicleType}${vehicle.year ? ` · ${vehicle.year}` : ""}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/transport/vehicles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DETAILS TAB */}
      {activeTab === "details" && (
        <div className="space-y-6 max-w-4xl">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Status</CardTitle>
              <StatusBadge status={vehicle.status} />
            </CardHeader>
            <CardContent>
              <PermissionGuard require="transport:vehicle:update">
                <div className="flex gap-2 items-end">
                  <div className="space-y-1">
                    <Label>Change Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus} disabled={savingStatus}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="IN_REPAIR">In Repair</SelectItem>
                        <SelectItem value="RETIRED">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={saveStatus}
                    disabled={savingStatus || newStatus === vehicle.status}
                    size="sm"
                  >
                    {savingStatus && <LoadingSpinner className="mr-2" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </PermissionGuard>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground font-medium">Plate</dt>
                  <dd className="font-semibold mt-0.5">{vehicle.plateNumber}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Make</dt>
                  <dd className="mt-0.5">{vehicle.make}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Model</dt>
                  <dd className="mt-0.5">{vehicle.model}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Year</dt>
                  <dd className="mt-0.5">{vehicle.year ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Type</dt>
                  <dd className="mt-0.5"><Badge variant="secondary">{vehicle.vehicleType}</Badge></dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Usage</dt>
                  <dd className="mt-0.5"><Badge variant={vehicle.usageType === "PRIVATE" ? "default" : "outline"}>{vehicle.usageType}</Badge></dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Fuel Type</dt>
                  <dd className="mt-0.5">{vehicle.fuelType ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Capacity</dt>
                  <dd className="mt-0.5">{vehicle.capacity != null ? `${vehicle.capacity} t` : "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Tank Capacity</dt>
                  <dd className="mt-0.5">{vehicle.fuelTankCapacity != null ? `${vehicle.fuelTankCapacity} L` : "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Color</dt>
                  <dd className="mt-0.5">{vehicle.color ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Chassis No</dt>
                  <dd className="mt-0.5 font-mono text-xs">{vehicle.chassisNumber ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Engine No</dt>
                  <dd className="mt-0.5 font-mono text-xs">{vehicle.engineNumber ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Insurance Expiry</dt>
                  <dd className="mt-0.5"><ExpiryDate date={vehicle.insuranceExpiry} /></dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Road Worthy Expiry</dt>
                  <dd className="mt-0.5"><ExpiryDate date={vehicle.roadWorthyExpiry} /></dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Next Service</dt>
                  <dd className="mt-0.5"><ExpiryDate date={vehicle.nextServiceDate} /></dd>
                </div>
                {vehicle.usageType === "PRIVATE" && (
                  <>
                    <div>
                      <dt className="text-muted-foreground font-medium">Avg Consumption</dt>
                      <dd className="mt-0.5">{vehicle.averageConsumption != null ? `${vehicle.averageConsumption.toFixed(1)} km/L` : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground font-medium">Next Refuel</dt>
                      <dd className="mt-0.5">{vehicle.nextRefuelAt ? <ExpiryDate date={vehicle.nextRefuelAt} /> : "—"}</dd>
                    </div>
                  </>
                )}
              </dl>
              {vehicle.notes && (
                <>
                  <Separator className="my-4" />
                  <p className="text-sm text-muted-foreground">{vehicle.notes}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Odometer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Current reading: <span className="font-semibold text-foreground">
                  {vehicle.odometer != null ? `${vehicle.odometer.toLocaleString()} km` : "Not recorded"}
                </span>
              </p>
              <PermissionGuard require="transport:vehicle:update">
                <div className="flex gap-2 items-end">
                  <div className="space-y-1">
                    <Label htmlFor="odometer">Update Odometer (km)</Label>
                    <Input
                      id="odometer"
                      type="number"
                      min="0"
                      value={odometerValue}
                      onChange={(e) => setOdometerValue(e.target.value)}
                      className="w-40"
                      disabled={savingOdo}
                    />
                  </div>
                  <Button onClick={saveOdometer} disabled={savingOdo} size="sm">
                    {savingOdo && <LoadingSpinner className="mr-2" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </PermissionGuard>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DOCUMENTS TAB */}
      {activeTab === "documents" && (
        <div className="max-w-4xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold">Documents</h2>
            <PermissionGuard require="transport:vehicle:update">
              <Button size="sm" onClick={() => setDocDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </PermissionGuard>
          </div>

          {(vehicle.documents ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No documents recorded.</p>
          ) : (
            <div className="space-y-3">
              {(vehicle.documents ?? []).map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="secondary" className="mb-2">{doc.documentType}</Badge>
                        {doc.documentNumber && (
                          <p className="text-sm font-mono">{doc.documentNumber}</p>
                        )}
                        {doc.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground space-y-0.5">
                        {doc.issuedAt && (
                          <p>Issued: {format(new Date(doc.issuedAt), "dd MMM yyyy")}</p>
                        )}
                        {doc.expiresAt && (
                          <p><ExpiryDate date={doc.expiresAt} /></p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={docDialog} onOpenChange={setDocDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Document Type <span className="text-destructive">*</span></Label>
                  <Select value={docForm.documentType || "__none"} onValueChange={(v) => setDocForm((p) => ({ ...p, documentType: v === "__none" ? "" : v }))} disabled={savingDoc}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Select type</SelectItem>
                      <SelectItem value="INSURANCE">Insurance</SelectItem>
                      <SelectItem value="ROAD_WORTHY">Road Worthy</SelectItem>
                      <SelectItem value="REGISTRATION">Registration</SelectItem>
                      <SelectItem value="SERVICE_RECORD">Service Record</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="docNumber">Document Number</Label>
                  <Input
                    id="docNumber"
                    value={docForm.documentNumber}
                    onChange={(e) => setDocForm((p) => ({ ...p, documentNumber: e.target.value }))}
                    disabled={savingDoc}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="docIssued">Issued Date</Label>
                    <Input
                      id="docIssued"
                      type="date"
                      value={docForm.issuedAt}
                      onChange={(e) => setDocForm((p) => ({ ...p, issuedAt: e.target.value }))}
                      disabled={savingDoc}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="docExpiry">Expiry Date</Label>
                    <Input
                      id="docExpiry"
                      type="date"
                      value={docForm.expiresAt}
                      onChange={(e) => setDocForm((p) => ({ ...p, expiresAt: e.target.value }))}
                      disabled={savingDoc}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="docNotes">Notes</Label>
                  <Input
                    id="docNotes"
                    value={docForm.notes}
                    onChange={(e) => setDocForm((p) => ({ ...p, notes: e.target.value }))}
                    disabled={savingDoc}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDocDialog(false)} disabled={savingDoc}>Cancel</Button>
                <Button onClick={addDocument} disabled={savingDoc}>
                  {savingDoc && <LoadingSpinner className="mr-2" />}
                  Add Document
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="max-w-4xl space-y-6">
          <div>
            <h2 className="text-base font-semibold mb-3">Assignments</h2>
            {(vehicle.assignments ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">No assignments recorded.</p>
            ) : (
              <div className="space-y-2">
                {(vehicle.assignments ?? []).map((a) => {
                  const driverName = a.driver?.employee?.fullName ??
                    ([a.driver?.firstName, a.driver?.lastName].filter(Boolean).join(" ") || "Unknown Driver");
                  return (
                    <Card key={a.id}>
                      <CardContent className="pt-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">
                            {driverName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(a.assignedAt), "dd MMM yyyy HH:mm")}
                            {a.returnedAt && ` → ${format(new Date(a.returnedAt), "dd MMM yyyy HH:mm")}`}
                          </p>
                        </div>
                        <StatusBadge status={a.status} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-base font-semibold mb-3">Recent Trips</h2>
            {(vehicle.trips ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">No trips recorded.</p>
            ) : (
              <div className="space-y-2">
                {(vehicle.trips ?? []).map((t) => (
                  <Card key={t.id}>
                    <CardContent className="pt-4 flex justify-between items-center">
                      <div>
                        <Link href={`/transport/trips/${t.id}`} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:underline">
                          {t.reference}
                        </Link>
                        <p className="text-sm mt-1">{t.origin} → {t.destination}</p>
                        {t.scheduledDeparture && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.scheduledDeparture), "dd MMM yyyy HH:mm")}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={t.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
