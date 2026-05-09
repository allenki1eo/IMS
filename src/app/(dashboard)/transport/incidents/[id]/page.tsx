"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
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

interface Incident {
  id: string;
  incidentType: string;
  incidentDate: string;
  location: string | null;
  description: string;
  status: string;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  vehicle?: {
    id: string;
    plateNumber: string;
    make: string;
    model: string;
  } | null;
  trip?: {
    id: string;
    reference: string;
  } | null;
}

const INCIDENT_TYPE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  BREAKDOWN: "warning",
  ACCIDENT: "destructive",
  FINE: "info",
  THEFT: "destructive",
  OTHER: "secondary",
};

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  const [updateForm, setUpdateForm] = useState({
    status: "",
    resolutionNotes: "",
    resolvedAt: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchIncident = useCallback(async () => {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      const json = await res.json();
      const inc = json.data ?? json;
      setIncident(inc);
      setUpdateForm({
        status: inc.status ?? "OPEN",
        resolutionNotes: inc.resolutionNotes ?? "",
        resolvedAt: inc.resolvedAt ? inc.resolvedAt.substring(0, 10) : "",
      });
    } catch {
      toast.error("Failed to load incident");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchIncident(); }, [fetchIncident]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: updateForm.status,
          resolutionNotes: updateForm.resolutionNotes || undefined,
          resolvedAt: updateForm.resolvedAt || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update incident"); return; }
      toast.success("Incident updated");
      fetchIncident();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!incident) return <div className="text-muted-foreground">Incident not found.</div>;

  const canUpdate = incident.status === "OPEN" || incident.status === "INVESTIGATING";

  return (
    <div>
      <PageHeader
        title={`Incident — ${incident.incidentType}`}
        description={
          incident.vehicle
            ? `${incident.vehicle.plateNumber} · ${incident.vehicle.make} ${incident.vehicle.model}`
            : "Fleet Incident"
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/transport/incidents">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="max-w-3xl space-y-6">
        {/* Status bar */}
        <div className="flex items-center gap-3">
          <StatusBadge status={incident.status} />
          <Badge variant={INCIDENT_TYPE_COLORS[incident.incidentType] ?? "secondary"}>
            {incident.incidentType}
          </Badge>
        </div>

        {/* Incident Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incident Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground font-medium">Vehicle</dt>
                <dd className="mt-0.5 font-semibold">
                  {incident.vehicle
                    ? (
                      <Link href={`/transport/vehicles/${incident.vehicle.id}`} className="hover:underline">
                        {incident.vehicle.plateNumber}
                      </Link>
                    )
                    : "—"}
                </dd>
                {incident.vehicle && (
                  <dd className="text-muted-foreground text-xs">
                    {incident.vehicle.make} {incident.vehicle.model}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-muted-foreground font-medium">Trip</dt>
                <dd className="mt-0.5">
                  {incident.trip ? (
                    <Link href={`/transport/trips/${incident.trip.id}`} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:underline">
                      {incident.trip.reference}
                    </Link>
                  ) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground font-medium">Date</dt>
                <dd className="mt-0.5">{format(new Date(incident.incidentDate), "dd MMM yyyy HH:mm")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground font-medium">Location</dt>
                <dd className="mt-0.5">{incident.location ?? "—"}</dd>
              </div>
              {incident.resolvedAt && (
                <div>
                  <dt className="text-muted-foreground font-medium">Resolved At</dt>
                  <dd className="mt-0.5">{format(new Date(incident.resolvedAt), "dd MMM yyyy")}</dd>
                </div>
              )}
            </dl>

            <Separator className="my-4" />

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
            </div>

            {incident.resolutionNotes && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Resolution Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{incident.resolutionNotes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Update form — only when OPEN or INVESTIGATING */}
        {canUpdate && (
          <PermissionGuard require="transport:incident:update">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Update Incident</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={updateForm.status} onValueChange={(v) => setUpdateForm((p) => ({ ...p, status: v }))} disabled={saving}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="resolutionNotes">Resolution Notes</Label>
                    <textarea
                      id="resolutionNotes"
                      value={updateForm.resolutionNotes}
                      onChange={(e) => setUpdateForm((p) => ({ ...p, resolutionNotes: e.target.value }))}
                      placeholder="Describe how the incident was resolved..."
                      rows={4}
                      disabled={saving}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="resolvedAt">Resolved At</Label>
                    <Input
                      id="resolvedAt"
                      type="date"
                      value={updateForm.resolvedAt}
                      onChange={(e) => setUpdateForm((p) => ({ ...p, resolvedAt: e.target.value }))}
                      className="w-48"
                      disabled={saving}
                    />
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving && <LoadingSpinner className="mr-2" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </PermissionGuard>
        )}
      </div>
    </div>
  );
}
