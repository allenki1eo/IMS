"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { BulkActionBar } from "@/components/shared/BulkActionBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { LoadingSpinner } from "@/components/shared/LoadingState";
import { usePagedData } from "@/hooks/usePagedData";

interface AssignmentRow {
  id: string;
  assignedAt: string;
  returnedAt: string | null;
  status: string;
  notes: string | null;
  vehicle?: {
    plateNumber: string;
    make: string;
    model: string;
  } | null;
  driver?: {
    firstName?: string | null;
    lastName?: string | null;
    employee?: {
      fullName: string;
    } | null;
  } | null;
}

interface VehicleOption {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
}

interface DriverOption {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  employee?: {
    fullName: string;
  } | null;
}

const PAGE_SIZE = 20;

export default function AssignmentsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<DriverOption[]>([]);
  const [assignForm, setAssignForm] = useState({ vehicleId: "", driverId: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  // Return confirm
  const [returningId, setReturningId] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);

  useEffect(() => { setPage(1); }, [statusFilter]);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (statusFilter !== "ALL") params.set("status", statusFilter);
  const url = `/api/vehicle-assignments?${params}`;
  const { data: assignments, total, loading, mutate } = usePagedData<AssignmentRow>(url);

  async function openCreateDialog() {
    setAssignForm({ vehicleId: "", driverId: "", notes: "" });
    try {
      const [vRes, dRes] = await Promise.all([
        fetch("/api/vehicles?status=ACTIVE&pageSize=200"),
        fetch("/api/drivers?isAvailable=true&pageSize=200"),
      ]);
      const [vJson, dJson] = await Promise.all([vRes.json(), dRes.json()]);
      setVehicles(vJson.data ?? []);
      setAvailableDrivers(dJson.data ?? []);
    } catch {
      toast.error("Failed to load options");
    }
    setCreateOpen(true);
  }

  async function handleAssign() {
    if (!assignForm.vehicleId) { toast.error("Select a vehicle"); return; }
    if (!assignForm.driverId) { toast.error("Select a driver"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/vehicle-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: assignForm.vehicleId,
          driverId: assignForm.driverId,
          notes: assignForm.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create assignment"); return; }
      toast.success("Vehicle assigned successfully");
      setCreateOpen(false);
      mutate();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkAction(action: "return" | "cancel") {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/vehicle-assignments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Bulk action failed"); return; }
      toast.success(`${json.data?.updated ?? selectedIds.length} assignment(s) ${action === "return" ? "returned" : "cancelled"}`);
      setSelectedIds([]);
      mutate();
    } catch {
      toast.error("Network error");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleReturn(assignmentId: string) {
    setReturning(true);
    try {
      const res = await fetch(`/api/vehicle-assignments/${assignmentId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to return vehicle"); return; }
      toast.success("Vehicle returned");
      setReturningId(null);
      mutate();
    } catch {
      toast.error("Network error");
    } finally {
      setReturning(false);
    }
  }

  const columns = [
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row: AssignmentRow) => (
        <div>
          <p className="font-semibold text-sm">{row.vehicle?.plateNumber ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            {row.vehicle ? `${row.vehicle.make} ${row.vehicle.model}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "driver",
      header: "Driver",
      cell: (row: AssignmentRow) => {
        const name = row.driver?.employee?.fullName ??
          ([row.driver?.firstName, row.driver?.lastName].filter(Boolean).join(" ") || "—");
        return (
          <span className="text-sm">
            {name}
          </span>
        );
      },
    },
    {
      key: "assignedAt",
      header: "Assigned At",
      cell: (row: AssignmentRow) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.assignedAt), "dd MMM yyyy HH:mm")}
        </span>
      ),
    },
    {
      key: "returnedAt",
      header: "Returned At",
      cell: (row: AssignmentRow) => (
        <span className="text-sm text-muted-foreground">
          {row.returnedAt ? format(new Date(row.returnedAt), "dd MMM yyyy HH:mm") : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: AssignmentRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: AssignmentRow) => {
        if (row.status !== "ACTIVE") return null;
        return (
          <PermissionGuard require="transport:assignment:update">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReturningId(row.id)}
            >
              Return
            </Button>
          </PermissionGuard>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Vehicle Assignments"
        description="Track which driver has which vehicle"
        actions={
          <PermissionGuard require="transport:assignment:create">
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Vehicle
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BulkActionBar
        selected={selectedIds}
        onClear={() => setSelectedIds([])}
        actions={[
          { label: "Return Selected", onClick: () => handleBulkAction("return"), loading: bulkLoading },
          { label: "Cancel Selected", variant: "destructive", onClick: () => handleBulkAction("cancel"), loading: bulkLoading },
        ]}
      />

      <DataTable
        columns={columns}
        data={assignments}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        selectable
        onSelectionChange={setSelectedIds}
        emptyTitle="No assignments found"
        emptyDescription="Assign a vehicle to a driver to get started."
      />

      {/* Create Assignment Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Vehicle to Driver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Vehicle <span className="text-destructive">*</span></Label>
              <Select value={assignForm.vehicleId || "__none"} onValueChange={(v) => setAssignForm((p) => ({ ...p, vehicleId: v === "__none" ? "" : v }))} disabled={submitting}>
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
              <Label>Driver <span className="text-destructive">*</span></Label>
              <Select value={assignForm.driverId || "__none"} onValueChange={(v) => setAssignForm((p) => ({ ...p, driverId: v === "__none" ? "" : v }))} disabled={submitting}>
                <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select driver</SelectItem>
                  {availableDrivers.map((d) => {
                    const name = d.employee?.fullName ??
                      ([d.firstName, d.lastName].filter(Boolean).join(" ") || d.id);
                    return (
                      <SelectItem key={d.id} value={d.id}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="assignNotes">Notes</Label>
              <Input
                id="assignNotes"
                value={assignForm.notes}
                onChange={(e) => setAssignForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional"
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleAssign} disabled={submitting}>
              {submitting && <LoadingSpinner className="mr-2" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Confirmation Dialog */}
      <Dialog open={!!returningId} onOpenChange={(open) => { if (!open) setReturningId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Vehicle?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will mark the vehicle as returned and make the driver available again. Are you sure?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturningId(null)} disabled={returning}>Cancel</Button>
            <Button onClick={() => returningId && handleReturn(returningId)} disabled={returning}>
              {returning && <LoadingSpinner className="mr-2" />}
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
