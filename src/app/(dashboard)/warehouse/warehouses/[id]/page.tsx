"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  status: string;
  warehouseType: string;
  branch?: { id: string; name: string } | null;
}

const WAREHOUSE_TYPES = ["MAIN", "DAYSTORE", "COLD_STORAGE", "PRODUCTION_FLOOR"];

interface Location {
  id: string;
  name: string;
  code: string;
  type: string;
  capacity: number | null;
  parent?: { id: string; name: string } | null;
}

const LOCATION_TYPES = ["AREA", "ZONE", "RACK", "BIN", "SHELF"];

const DEFAULT_LOC_FORM = {
  name: "",
  code: "",
  type: "RACK",
  parentId: "",
  capacity: "",
};

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [addingLoc, setAddingLoc] = useState(false);
  const [locForm, setLocForm] = useState(DEFAULT_LOC_FORM);

  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    address: "",
    warehouseType: "MAIN",
  });

  const fetchWarehouse = useCallback(async () => {
    try {
      const res = await fetch(`/api/warehouses/${id}`);
      const json = await res.json();
      const w = json.data ?? json;
      setWarehouse(w);
      setEditForm({
        name: w.name ?? "",
        code: w.code ?? "",
        address: w.address ?? "",
        warehouseType: w.warehouseType ?? "MAIN",
      });
    } catch {
      toast.error("Failed to load warehouse");
    }
  }, [id]);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch(`/api/warehouses/${id}/locations?pageSize=200`);
      const json = await res.json();
      setLocations(json.data ?? json ?? []);
    } catch {
      toast.error("Failed to load locations");
    }
  }, [id]);

  useEffect(() => {
    Promise.all([fetchWarehouse(), fetchLocations()]).finally(() => setLoading(false));
  }, [fetchWarehouse, fetchLocations]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.code.trim()) {
      toast.error("Name and Code are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          code: editForm.code,
          address: editForm.address || undefined,
          warehouseType: editForm.warehouseType,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update"); return; }
      setWarehouse((w) => w ? { ...w, ...editForm } : w);
      toast.success("Warehouse updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!warehouse) return;
    const newStatus = warehouse.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setTogglingStatus(true);
    try {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update status"); return; }
      setWarehouse((w) => w ? { ...w, status: newStatus } : w);
      toast.success(`Warehouse ${newStatus === "ACTIVE" ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Network error");
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!locForm.name.trim() || !locForm.code.trim()) {
      toast.error("Name and Code are required");
      return;
    }
    setAddingLoc(true);
    try {
      const res = await fetch(`/api/warehouses/${id}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: locForm.name,
          code: locForm.code.toUpperCase(),
          type: locForm.type,
          parentId: locForm.parentId || undefined,
          capacity: locForm.capacity ? Number(locForm.capacity) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to add location"); return; }
      toast.success("Location added");
      setShowAddLocation(false);
      setLocForm(DEFAULT_LOC_FORM);
      fetchLocations();
    } catch {
      toast.error("Network error");
    } finally {
      setAddingLoc(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!warehouse) return <div className="text-muted-foreground">Warehouse not found.</div>;

  return (
    <div>
      <PageHeader
        title={warehouse.name}
        description={`Code: ${warehouse.code}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/warehouse/warehouses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Edit form */}
        <PermissionGuard require="warehouse:warehouse:update">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Warehouse Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="code">
                      Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="code"
                      value={editForm.code}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                      }
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={editForm.address}
                    onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Warehouse Type</Label>
                  <Select
                    value={editForm.warehouseType}
                    onValueChange={(v) => setEditForm((p) => ({ ...p, warehouseType: v }))}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WAREHOUSE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving && <LoadingSpinner className="mr-2" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </PermissionGuard>

        {/* Status card */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusBadge status={warehouse.status} />
              <p className="text-sm text-muted-foreground">
                Type: <span className="text-foreground font-medium">{warehouse.warehouseType.replace(/_/g, " ")}</span>
              </p>
              {warehouse.branch && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground">
                    Branch: <span className="text-foreground font-medium">{warehouse.branch.name}</span>
                  </p>
                </>
              )}
              <PermissionGuard require="warehouse:warehouse:update">
                <Button
                  size="sm"
                  variant={warehouse.status === "ACTIVE" ? "outline" : "default"}
                  onClick={toggleStatus}
                  disabled={togglingStatus}
                  className="w-full"
                >
                  {togglingStatus && <LoadingSpinner className="mr-2" />}
                  {warehouse.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </Button>
              </PermissionGuard>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Locations section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Storage Locations</h2>
          <PermissionGuard require="warehouse:location:create">
            <Button size="sm" onClick={() => setShowAddLocation(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </PermissionGuard>
        </div>

        {locations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No locations defined yet.</p>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Parent</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Capacity</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{loc.code}</code>
                    </td>
                    <td className="px-4 py-3 font-medium">{loc.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{loc.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{loc.parent?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {loc.capacity != null ? loc.capacity : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Location Dialog */}
      <Dialog open={showAddLocation} onOpenChange={setShowAddLocation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLocation} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="loc-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="loc-name"
                  value={locForm.name}
                  onChange={(e) => setLocForm((p) => ({ ...p, name: e.target.value }))}
                  disabled={addingLoc}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="loc-code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="loc-code"
                  value={locForm.code}
                  onChange={(e) =>
                    setLocForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                  }
                  disabled={addingLoc}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={locForm.type}
                onValueChange={(v) => setLocForm((p) => ({ ...p, type: v }))}
                disabled={addingLoc}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Parent Location</Label>
              <Select
                value={locForm.parentId || "__none"}
                onValueChange={(v) =>
                  setLocForm((p) => ({ ...p, parentId: v === "__none" ? "" : v }))
                }
                disabled={addingLoc}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None (top-level)</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="loc-capacity">Capacity</Label>
              <Input
                id="loc-capacity"
                type="number"
                min="0"
                value={locForm.capacity}
                onChange={(e) => setLocForm((p) => ({ ...p, capacity: e.target.value }))}
                placeholder="Optional"
                disabled={addingLoc}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddLocation(false)} disabled={addingLoc}>
                Cancel
              </Button>
              <Button type="submit" disabled={addingLoc}>
                {addingLoc && <LoadingSpinner className="mr-2" />}
                Add Location
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
