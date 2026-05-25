"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Truck, MapPin, Clock, Package, Fuel } from "lucide-react";
import { format } from "date-fns";
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

interface CargoLine {
  id: string;
  description: string;
  quantity: number | null;
  uom: string | null;
}

interface LogEntry {
  id: string;
  eventType: string;
  eventTime: string;
  location: string | null;
  odometer: number | null;
  notes: string | null;
}

interface Trip {
  id: string;
  reference: string;
  status: string;
  priority: string;
  origin: string;
  destination: string;
  scheduledDeparture: string | null;
  scheduledArrival: string | null;
  actualDeparture: string | null;
  actualArrival: string | null;
  cargoDescription: string | null;
  cargoWeight: number | null;
  notes: string | null;
  vehicle?: { id: string; plateNumber: string; make: string; model: string } | null;
  driver?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    employee?: { fullName: string } | null;
  } | null;
  cargo?: CargoLine[];
  logs?: LogEntry[];
}

const LOG_EVENT_ICONS: Record<string, string> = {
  STOP: "🛑",
  INCIDENT: "⚠️",
  FUEL_STOP: "⛽",
  DEPARTURE: "🚀",
  ARRIVAL: "🏁",
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  // Dispatch dialog
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({ actualDeparture: "", odometer: "" });
  const [dispatching, setDispatching] = useState(false);

  // Complete dialog
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeForm, setCompleteForm] = useState({ actualArrival: "", odometer: "", notes: "" });
  const [completing, setCompleting] = useState(false);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Add log dialog
  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ eventType: "", location: "", odometer: "", notes: "" });
  const [addingLog, setAddingLog] = useState(false);

  const fetchTrip = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${id}`);
      const json = await res.json();
      setTrip(json.data ?? json);
    } catch {
      toast.error("Failed to load trip");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTrip(); }, [fetchTrip]);

  async function handleDispatch() {
    setDispatching(true);
    try {
      const res = await fetch(`/api/trips/${id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualDeparture: dispatchForm.actualDeparture || undefined,
          odometer: dispatchForm.odometer ? Number(dispatchForm.odometer) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to dispatch trip"); return; }
      toast.success("Trip dispatched");
      setDispatchOpen(false);
      fetchTrip();
    } catch {
      toast.error("Network error");
    } finally {
      setDispatching(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/trips/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualArrival: completeForm.actualArrival || undefined,
          odometer: completeForm.odometer ? Number(completeForm.odometer) : undefined,
          notes: completeForm.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to complete trip"); return; }
      toast.success("Trip completed");
      setCompleteOpen(false);
      fetchTrip();
    } catch {
      toast.error("Network error");
    } finally {
      setCompleting(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/trips/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to cancel trip"); return; }
      toast.success("Trip cancelled");
      setCancelOpen(false);
      fetchTrip();
    } catch {
      toast.error("Network error");
    } finally {
      setCancelling(false);
    }
  }

  async function handleAddLog() {
    if (!logForm.eventType) { toast.error("Event type is required"); return; }
    setAddingLog(true);
    try {
      const res = await fetch(`/api/trips/${id}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: logForm.eventType,
          location: logForm.location || undefined,
          odometer: logForm.odometer ? Number(logForm.odometer) : undefined,
          notes: logForm.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to add log entry"); return; }
      toast.success("Log entry added");
      setLogOpen(false);
      setLogForm({ eventType: "", location: "", odometer: "", notes: "" });
      fetchTrip();
    } catch {
      toast.error("Network error");
    } finally {
      setAddingLog(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!trip) return <div className="text-muted-foreground">Trip not found.</div>;

  const driverName = trip.driver?.employee?.fullName ??
    ([trip.driver?.firstName, trip.driver?.lastName].filter(Boolean).join(" ") || "—");

  return (
    <div>
      <PageHeader
        title={`Trip ${trip.reference}`}
        description={`${trip.origin} → ${trip.destination}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/transport/trips">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      {/* Status bar & actions */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <StatusBadge status={trip.status} />
        <StatusBadge status={trip.priority} />

        {trip.status === "PLANNED" && (
          <>
            <PermissionGuard require="transport:trip:dispatch">
              <Button size="sm" onClick={() => {
                setDispatchForm({ actualDeparture: "", odometer: "" });
                setDispatchOpen(true);
              }}>
                <Truck className="h-4 w-4 mr-2" />
                Dispatch
              </Button>
            </PermissionGuard>
            <PermissionGuard require="transport:trip:update">
              <Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)}>
                Cancel
              </Button>
            </PermissionGuard>
          </>
        )}

        {trip.status === "COMPLETED" && trip.vehicle?.id && (
          <PermissionGuard require="fuel:issue:create">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/fuel/issues/create?vehicleId=${trip.vehicle.id}&tripRef=${encodeURIComponent(trip.reference)}`}>
                <Fuel className="h-4 w-4 mr-2" />
                Record Fuel
              </Link>
            </Button>
          </PermissionGuard>
        )}

        {trip.status === "DISPATCHED" && (
          <>
            <PermissionGuard require="transport:trip:complete">
              <Button size="sm" onClick={() => {
                setCompleteForm({ actualArrival: "", odometer: "", notes: "" });
                setCompleteOpen(true);
              }}>
                Complete
              </Button>
            </PermissionGuard>
            <PermissionGuard require="transport:trip:update">
              <Button size="sm" variant="outline" onClick={() => {
                setLogForm({ eventType: "", location: "", odometer: "", notes: "" });
                setLogOpen(true);
              }}>
                Add Log Entry
              </Button>
            </PermissionGuard>
          </>
        )}
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Info grid */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-muted-foreground font-medium flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" /> Vehicle
                </p>
                <p className="mt-0.5 font-medium">
                  {trip.vehicle
                    ? `${trip.vehicle.plateNumber} — ${trip.vehicle.make} ${trip.vehicle.model}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Driver</p>
                <p className="mt-0.5">{driverName}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Origin
                </p>
                <p className="mt-0.5">{trip.origin}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Destination
                </p>
                <p className="mt-0.5">{trip.destination}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Scheduled Departure
                </p>
                <p className="mt-0.5">
                  {trip.scheduledDeparture
                    ? format(new Date(trip.scheduledDeparture), "dd MMM yyyy HH:mm")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Scheduled Arrival
                </p>
                <p className="mt-0.5">
                  {trip.scheduledArrival
                    ? format(new Date(trip.scheduledArrival), "dd MMM yyyy HH:mm")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Actual Departure</p>
                <p className="mt-0.5">
                  {trip.actualDeparture
                    ? format(new Date(trip.actualDeparture), "dd MMM yyyy HH:mm")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Actual Arrival</p>
                <p className="mt-0.5">
                  {trip.actualArrival
                    ? format(new Date(trip.actualArrival), "dd MMM yyyy HH:mm")
                    : "—"}
                </p>
              </div>
              {trip.cargoDescription && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-muted-foreground font-medium flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" /> Cargo
                  </p>
                  <p className="mt-0.5">
                    {trip.cargoDescription}
                    {trip.cargoWeight != null && (
                      <span className="text-muted-foreground ml-2">({trip.cargoWeight} t)</span>
                    )}
                  </p>
                </div>
              )}
              {trip.notes && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-muted-foreground font-medium">Notes</p>
                  <p className="mt-0.5 text-muted-foreground">{trip.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trip Log */}
        <div>
          <h2 className="text-base font-semibold mb-3">Trip Log</h2>
          {(trip.logs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No log entries yet.</p>
          ) : (
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
              {[...(trip.logs ?? [])].sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()).map((log) => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-4 top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                  <div className="bg-muted/40 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{LOG_EVENT_ICONS[log.eventType] ?? "📍"}</span>
                      <Badge variant="secondary">{log.eventType}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(log.eventTime), "dd MMM yyyy HH:mm")}
                      </span>
                    </div>
                    {log.location && (
                      <p className="text-sm font-medium">{log.location}</p>
                    )}
                    {log.odometer != null && (
                      <p className="text-xs text-muted-foreground">{log.odometer.toLocaleString()} km</p>
                    )}
                    {log.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cargo Lines */}
        {(trip.cargo ?? []).length > 0 && (
          <div>
            <h2 className="text-base font-semibold mb-3">Cargo Lines</h2>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Quantity</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {(trip.cargo ?? []).map((line) => (
                    <tr key={line.id} className="border-t">
                      <td className="px-4 py-2">{line.description}</td>
                      <td className="px-4 py-2 text-muted-foreground">{line.quantity ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{line.uom ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Dispatch Dialog */}
      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispatch Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="actualDeparture">Actual Departure</Label>
              <Input
                id="actualDeparture"
                type="datetime-local"
                value={dispatchForm.actualDeparture}
                onChange={(e) => setDispatchForm((p) => ({ ...p, actualDeparture: e.target.value }))}
                disabled={dispatching}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dispOdometer">Odometer Reading (km)</Label>
              <Input
                id="dispOdometer"
                type="number"
                min="0"
                value={dispatchForm.odometer}
                onChange={(e) => setDispatchForm((p) => ({ ...p, odometer: e.target.value }))}
                placeholder="0"
                disabled={dispatching}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchOpen(false)} disabled={dispatching}>Cancel</Button>
            <Button onClick={handleDispatch} disabled={dispatching}>
              {dispatching && <LoadingSpinner className="mr-2" />}
              Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="actualArrival">Actual Arrival</Label>
              <Input
                id="actualArrival"
                type="datetime-local"
                value={completeForm.actualArrival}
                onChange={(e) => setCompleteForm((p) => ({ ...p, actualArrival: e.target.value }))}
                disabled={completing}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="compOdometer">Odometer Reading (km)</Label>
              <Input
                id="compOdometer"
                type="number"
                min="0"
                value={completeForm.odometer}
                onChange={(e) => setCompleteForm((p) => ({ ...p, odometer: e.target.value }))}
                placeholder="0"
                disabled={completing}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="compNotes">Notes</Label>
              <Input
                id="compNotes"
                value={completeForm.notes}
                onChange={(e) => setCompleteForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional completion notes"
                disabled={completing}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={completing}>Cancel</Button>
            <Button onClick={handleComplete} disabled={completing}>
              {completing && <LoadingSpinner className="mr-2" />}
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Trip?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will cancel trip <strong>{trip.reference}</strong>. This action cannot be undone.
          </p>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason (optional)</Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation reason"
              disabled={cancelling}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>Back</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling && <LoadingSpinner className="mr-2" />}
              Cancel Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Log Dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Log Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Event Type <span className="text-destructive">*</span></Label>
              <Select value={logForm.eventType || "__none"} onValueChange={(v) => setLogForm((p) => ({ ...p, eventType: v === "__none" ? "" : v }))} disabled={addingLog}>
                <SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select event type</SelectItem>
                  <SelectItem value="STOP">Stop</SelectItem>
                  <SelectItem value="INCIDENT">Incident</SelectItem>
                  <SelectItem value="FUEL_STOP">Fuel Stop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="logLocation">Location</Label>
              <Input
                id="logLocation"
                value={logForm.location}
                onChange={(e) => setLogForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Nakuru Town"
                disabled={addingLog}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="logOdometer">Odometer (km)</Label>
              <Input
                id="logOdometer"
                type="number"
                min="0"
                value={logForm.odometer}
                onChange={(e) => setLogForm((p) => ({ ...p, odometer: e.target.value }))}
                placeholder="0"
                disabled={addingLog}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="logNotes">Notes</Label>
              <Input
                id="logNotes"
                value={logForm.notes}
                onChange={(e) => setLogForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional notes"
                disabled={addingLog}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)} disabled={addingLog}>Cancel</Button>
            <Button onClick={handleAddLog} disabled={addingLog}>
              {addingLog && <LoadingSpinner className="mr-2" />}
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
