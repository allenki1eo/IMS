"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
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

interface WorkOrder {
  id: string;
  reference: string;
  status: string;
  priority: string;
  maintenanceType: string;
  description?: string | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
  notes?: string | null;
  odometerAtWork?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  vehicle?: { id: string; plateNumber: string; make?: string; model?: string } | null;
  assignedTo?: { firstName: string; lastName: string } | null;
  schedule?: { id: string; maintenanceType: string } | null;
}

interface WorkOrderItem {
  id: string;
  itemType: string;
  description: string;
  sparePart?: { id: string; code: string; name: string } | null;
  quantity: number;
  unitCost?: number | null;
  totalCost?: number | null;
}

interface SparePartOption {
  id: string;
  code: string;
  name: string;
}

const ITEM_TYPES = [
  { value: "LABOUR", label: "Labour" },
  { value: "PART", label: "Spare Part" },
  { value: "OTHER", label: "Other" },
];

function priorityClass(priority: string): string {
  switch (priority) {
    case "CRITICAL": return "bg-red-100 text-red-700";
    case "HIGH": return "bg-orange-100 text-orange-700";
    case "MEDIUM": return "bg-yellow-100 text-yellow-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

export default function WorkOrderDetailPage() {
  const currency = useCurrency();
  const { id } = useParams<{ id: string }>();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [items, setItems] = useState<WorkOrderItem[]>([]);
  const [spareParts, setSpareParts] = useState<SparePartOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Complete dialog
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    actualCost: "",
    completionNotes: "",
    odometerAtService: "",
  });

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    itemType: "LABOUR",
    description: "",
    sparePartId: "",
    quantity: "1",
    unitCost: "",
  });
  const [addingItem, setAddingItem] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/maintenance/work-orders/${id}`).then((r) => r.json()),
      fetch("/api/maintenance/spare-parts?pageSize=200").then((r) => r.json()),
    ])
      .then(([woData, partsData]) => {
        setWorkOrder(woData.data);
        setItems(woData.data?.items ?? []);
        setSpareParts(partsData.data ?? []);
      })
      .catch(() => toast.error("Failed to load work order"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAction(action: "start" | "cancel") {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/maintenance/work-orders/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? `Failed to ${action} work order`); return; }
      setWorkOrder((prev) => prev ? { ...prev, ...json.data } : prev);
      toast.success(`Work order ${action === "start" ? "started" : "cancelled"}`);
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/maintenance/work-orders/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualCost: completeForm.actualCost ? parseFloat(completeForm.actualCost) : undefined,
          completionNotes: completeForm.completionNotes || undefined,
          odometerAtService: completeForm.odometerAtService ? parseFloat(completeForm.odometerAtService) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to complete work order"); return; }
      setWorkOrder((prev) => prev ? { ...prev, ...json.data } : prev);
      setShowCompleteDialog(false);
      toast.success("Work order completed");
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemForm.description || !itemForm.quantity || !itemForm.unitCost) {
      toast.error("Description, quantity, and unit cost are required");
      return;
    }
    setAddingItem(true);
    try {
      const res = await fetch(`/api/maintenance/work-orders/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: itemForm.itemType,
          description: itemForm.description,
          sparePartId: itemForm.itemType === "PART" && itemForm.sparePartId ? itemForm.sparePartId : undefined,
          quantity: parseFloat(itemForm.quantity),
          unitCost: parseFloat(itemForm.unitCost),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to add item"); return; }
      setItems((prev) => [...prev, json.data]);
      setItemForm({ itemType: "LABOUR", description: "", sparePartId: "", quantity: "1", unitCost: "" });
      setShowAddItem(false);
      toast.success("Item added");
    } catch {
      toast.error("Network error");
    } finally {
      setAddingItem(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      const res = await fetch(`/api/maintenance/work-orders/${id}/items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) { const j = await res.json(); toast.error(j.error ?? "Failed to delete item"); return; }
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      toast.success("Item removed");
    } catch {
      toast.error("Network error");
    }
  }

  if (loading) return <LoadingState />;
  if (!workOrder) return <div className="text-muted-foreground">Work order not found.</div>;

  const totalItemsCost = items.reduce((sum, i) => sum + (i.totalCost ?? 0), 0);

  return (
    <div>
      <PageHeader
        title={workOrder.reference}
        description={workOrder.maintenanceType.replace(/_/g, " ")}
        actions={
          <Button variant="outline" asChild>
            <Link href="/maintenance/work-orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      {/* Header info */}
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Work Order Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Status</p>
              <div className="mt-1"><StatusBadge status={workOrder.status} /></div>
            </div>
            <div>
              <p className="text-muted-foreground">Priority</p>
              <div className="mt-1">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass(workOrder.priority)}`}>
                  {workOrder.priority}
                </span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Vehicle</p>
              <p className="font-medium mt-1">{workOrder.vehicle?.plateNumber ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Assigned To</p>
              <p className="mt-1">
                {workOrder.assignedTo
                  ? `${workOrder.assignedTo.firstName} ${workOrder.assignedTo.lastName}`
                  : "—"}
              </p>
            </div>
            {workOrder.startedAt && (
              <div>
                <p className="text-muted-foreground">Started</p>
                <p className="mt-1">{format(new Date(workOrder.startedAt), "dd MMM yyyy HH:mm")}</p>
              </div>
            )}
            {workOrder.completedAt && (
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="mt-1">{format(new Date(workOrder.completedAt), "dd MMM yyyy HH:mm")}</p>
              </div>
            )}
            {workOrder.odometerAtWork != null && (
              <div>
                <p className="text-muted-foreground">Odometer at Service</p>
                <p className="mt-1">{workOrder.odometerAtWork.toLocaleString()} km</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-muted-foreground">Description</p>
              <p className="mt-1">{workOrder.description ?? "—"}</p>
            </div>
            {workOrder.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Completion Notes</p>
                <p className="mt-1">{workOrder.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Cost</span>
              <span>
                {workOrder.estimatedCost != null
                  ? `${currency} ${workOrder.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items Total</span>
              <span>{currency} {totalItemsCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {workOrder.actualCost != null && (
              <div className="flex justify-between font-semibold border-t pt-3">
                <span>Actual Cost</span>
                <span className="text-lg">
                  {currency} {workOrder.actualCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <PermissionGuard require="maintenance:workorder:update">
        <div className="flex gap-2 mb-6">
          {workOrder.status === "PENDING" && (
            <>
              <Button
                onClick={() => handleAction("start")}
                disabled={actionLoading}
              >
                {actionLoading && <LoadingSpinner className="mr-2" />}
                Start Work Order
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleAction("cancel")}
                disabled={actionLoading}
              >
                Cancel
              </Button>
            </>
          )}
          {workOrder.status === "IN_PROGRESS" && (
            <Button
              onClick={() => setShowCompleteDialog(true)}
              disabled={actionLoading}
            >
              Complete Work Order
            </Button>
          )}
        </div>
      </PermissionGuard>

      {/* Complete dialog */}
      {showCompleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Complete Work Order</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleComplete} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="actualCost">Actual Cost</Label>
                  <Input
                    id="actualCost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={completeForm.actualCost}
                    onChange={(e) => setCompleteForm((p) => ({ ...p, actualCost: e.target.value }))}
                    placeholder="e.g. 320.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="odometerAtService">Odometer at Service (km)</Label>
                  <Input
                    id="odometerAtService"
                    type="number"
                    min="0"
                    step="1"
                    value={completeForm.odometerAtService}
                    onChange={(e) => setCompleteForm((p) => ({ ...p, odometerAtService: e.target.value }))}
                    placeholder="e.g. 145000"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="completionNotes">Completion Notes</Label>
                  <textarea
                    id="completionNotes"
                    value={completeForm.completionNotes}
                    onChange={(e) => setCompleteForm((p) => ({ ...p, completionNotes: e.target.value }))}
                    rows={3}
                    placeholder="Notes on work performed..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCompleteDialog(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading}>
                    {actionLoading && <LoadingSpinner className="mr-2" />}
                    Complete
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Work Order Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Work Order Items</CardTitle>
          {workOrder.status !== "COMPLETED" && workOrder.status !== "CANCELLED" && (
            <PermissionGuard require="maintenance:workorder:update">
              <Button
                size="sm"
                onClick={() => setShowAddItem(!showAddItem)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </PermissionGuard>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {showAddItem && (
            <div className="px-4 py-4 border-b bg-muted/20">
              <form onSubmit={handleAddItem} className="space-y-3">
                <p className="text-sm font-medium">Add Item</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={itemForm.itemType}
                      onValueChange={(v) => setItemForm((p) => ({ ...p, itemType: v, sparePartId: "" }))}
                      disabled={addingItem}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      className="h-8"
                      value={itemForm.description}
                      onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Describe the item"
                      disabled={addingItem}
                    />
                  </div>
                </div>
                {itemForm.itemType === "PART" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Spare Part</Label>
                    <Select
                      value={itemForm.sparePartId || "__none"}
                      onValueChange={(v) => setItemForm((p) => ({ ...p, sparePartId: v === "__none" ? "" : v }))}
                      disabled={addingItem}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select spare part" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Select a part...</SelectItem>
                        {spareParts.map((sp) => (
                          <SelectItem key={sp.id} value={sp.id}>
                            {sp.code} — {sp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      className="h-8"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={itemForm.quantity}
                      onChange={(e) => setItemForm((p) => ({ ...p, quantity: e.target.value }))}
                      disabled={addingItem}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit Cost</Label>
                    <Input
                      className="h-8"
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemForm.unitCost}
                      onChange={(e) => setItemForm((p) => ({ ...p, unitCost: e.target.value }))}
                      placeholder="0.00"
                      disabled={addingItem}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={addingItem}>
                    {addingItem && <LoadingSpinner className="mr-1" />}
                    Add
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddItem(false)}
                    disabled={addingItem}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Part Code</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Qty</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit Cost</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                  {workOrder.status !== "COMPLETED" && workOrder.status !== "CANCELLED" && (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={workOrder.status !== "COMPLETED" && workOrder.status !== "CANCELLED" ? 7 : 6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No items added yet
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">
                          {item.itemType}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="px-4 py-3">
                        {item.sparePart ? (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {item.sparePart.code}
                          </code>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">{item.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {currency} {(item.unitCost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {currency} {(item.totalCost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {workOrder.status !== "COMPLETED" && workOrder.status !== "CANCELLED" && (
                        <td className="px-4 py-3">
                          <PermissionGuard require="maintenance:workorder:update">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </PermissionGuard>
                        </td>
                      )}
                    </tr>
                  ))
                )}
                {items.length > 0 && (
                  <tr className="border-t bg-muted/20 font-semibold">
                    <td colSpan={5} className="px-4 py-3 text-right">Total</td>
                    <td className="px-4 py-3">
                      {currency} {totalItemsCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {workOrder.status !== "COMPLETED" && workOrder.status !== "CANCELLED" && (
                      <td className="px-4 py-3" />
                    )}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
