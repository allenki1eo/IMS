"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
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

interface SparePart {
  id: string;
  code: string;
  name: string;
  partNumber?: string | null;
  uom: string;
  unitCost: number;
  currentStock: number;
  minStock: number;
  description?: string | null;
  status: string;
  category?: { id: string; name: string } | null;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface TransactionRow {
  id: string;
  createdAt: string;
  type: string;
  quantity: number;
  unitCost?: number | null;
  reference?: string | null;
  notes?: string | null;
  workOrder?: { reference: string } | null;
}

function stockStatusLabel(part: SparePart): { label: string; color: string } {
  if (part.currentStock === 0) return { label: "Out of Stock", color: "text-red-600" };
  if (part.currentStock <= part.minStock) return { label: "Low Stock", color: "text-amber-600" };
  return { label: "In Stock", color: "text-green-600" };
}

export default function SparePartDetailPage() {
  const currency = useCurrency();
  const { id } = useParams<{ id: string }>();
  const [part, setPart] = useState<SparePart | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "transactions">("details");

  // Receive stock dialog
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    quantity: "",
    unitCost: "",
    reference: "",
    notes: "",
  });
  const [receiving, setReceiving] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    categoryId: "",
    partNumber: "",
    uom: "",
    unitCost: "",
    minStock: "",
    description: "",
    status: "ACTIVE",
  });

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/maintenance/spare-parts/${id}`).then((r) => r.json()),
      fetch("/api/maintenance/spare-part-categories?pageSize=200").then((r) => r.json()),
    ])
      .then(([partData, catsData]) => {
        const p: SparePart = partData.data;
        setPart(p);
        setCategories(catsData.data ?? []);
        if (p) {
          setEditForm({
            name: p.name,
            categoryId: p.category?.id ?? "",
            partNumber: p.partNumber ?? "",
            uom: p.uom,
            unitCost: String(p.unitCost),
            minStock: String(p.minStock),
            description: p.description ?? "",
            status: p.status,
          });
        }
      })
      .catch(() => toast.error("Failed to load spare part"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (activeTab === "transactions") {
      fetch(`/api/maintenance/spare-parts/${id}/receipts?pageSize=100`)
        .then((r) => r.json())
        .then((d) => setTransactions(d.data ?? []))
        .catch(() => toast.error("Failed to load transactions"));
    }
  }, [activeTab, id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/maintenance/spare-parts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          categoryId: editForm.categoryId || undefined,
          partNumber: editForm.partNumber || undefined,
          uom: editForm.uom,
          unitCost: parseFloat(editForm.unitCost) || 0,
          minStock: parseFloat(editForm.minStock) || 0,
          description: editForm.description || undefined,
          status: editForm.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update part"); return; }
      setPart((prev) => prev ? { ...prev, ...json.data } : prev);
      toast.success("Part updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleReceive(e: React.FormEvent) {
    e.preventDefault();
    if (!receiveForm.quantity || parseFloat(receiveForm.quantity) <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    setReceiving(true);
    try {
      const res = await fetch(`/api/maintenance/spare-parts/${id}/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: parseFloat(receiveForm.quantity),
          unitCost: receiveForm.unitCost ? parseFloat(receiveForm.unitCost) : undefined,
          reference: receiveForm.reference || undefined,
          notes: receiveForm.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to receive stock"); return; }
      setPart((prev) => prev ? { ...prev, currentStock: prev.currentStock + parseFloat(receiveForm.quantity) } : prev);
      setReceiveForm({ quantity: "", unitCost: "", reference: "", notes: "" });
      setShowReceiveDialog(false);
      setActiveTab("transactions");
      toast.success("Stock received successfully");
    } catch {
      toast.error("Network error");
    } finally {
      setReceiving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!part) return <div className="text-muted-foreground">Spare part not found.</div>;

  const stockPct = part.minStock > 0 ? Math.min((part.currentStock / (part.minStock * 2)) * 100, 100) : part.currentStock > 0 ? 100 : 0;
  const stockStatus = stockStatusLabel(part);
  const stockBarColor = part.currentStock === 0 ? "#ef4444" : part.currentStock <= part.minStock ? "#f59e0b" : "#22c55e";

  return (
    <div>
      <PageHeader
        title={part.name}
        description={part.code}
        actions={
          <div className="flex gap-2">
            <PermissionGuard require="maintenance:part:update">
              <Button onClick={() => setShowReceiveDialog(true)}>
                Receive Stock
              </Button>
            </PermissionGuard>
            <Button variant="outline" asChild>
              <Link href="/maintenance/parts">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b mb-6 gap-1">
        {(["details", "transactions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Receive Stock Dialog */}
      {showReceiveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Receive Stock — {part.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReceive} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="recvQty">Quantity ({part.uom}) <span className="text-destructive">*</span></Label>
                  <Input
                    id="recvQty"
                    type="number"
                    min="0"
                    step="0.01"
                    value={receiveForm.quantity}
                    onChange={(e) => setReceiveForm((p) => ({ ...p, quantity: e.target.value }))}
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="recvCost">Unit Cost</Label>
                  <Input
                    id="recvCost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={receiveForm.unitCost}
                    onChange={(e) => setReceiveForm((p) => ({ ...p, unitCost: e.target.value }))}
                    placeholder="e.g. 25.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="recvRef">Reference</Label>
                  <Input
                    id="recvRef"
                    value={receiveForm.reference}
                    onChange={(e) => setReceiveForm((p) => ({ ...p, reference: e.target.value }))}
                    placeholder="e.g. PO-2026-001"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="recvNotes">Notes</Label>
                  <textarea
                    id="recvNotes"
                    value={receiveForm.notes}
                    onChange={(e) => setReceiveForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    placeholder="Optional notes..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReceiveDialog(false)}
                    disabled={receiving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={receiving}>
                    {receiving && <LoadingSpinner className="mr-2" />}
                    Receive
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "details" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Stock Level */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock Level</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className={`text-3xl font-bold ${stockStatus.color}`}>
                  {part.currentStock.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{part.uom}</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${stockPct}%`, backgroundColor: stockBarColor }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Min: {part.minStock.toLocaleString()} {part.uom}</span>
                <span>Target: {(part.minStock * 2).toLocaleString()} {part.uom}</span>
              </div>
              <div>
                <span className={`text-sm font-semibold ${stockStatus.color}`}>{stockStatus.label}</span>
              </div>
              <div className="text-sm space-y-1 border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit Cost</span>
                  <span>{currency} {part.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Stock Value</span>
                  <span>{currency} {(part.currentStock * part.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              {part.partNumber && (
                <div className="text-sm border-t pt-3">
                  <p className="text-muted-foreground text-xs">Part Number</p>
                  <p className="font-mono">{part.partNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit form */}
          <PermissionGuard require="maintenance:part:update">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Part Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="editCode">Code</Label>
                      <Input id="editCode" value={part.code} disabled />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="editName">Name</Label>
                      <Input
                        id="editName"
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Category</Label>
                      <Select
                        value={editForm.categoryId || "__none"}
                        onValueChange={(v) => setEditForm((p) => ({ ...p, categoryId: v === "__none" ? "" : v }))}
                        disabled={saving}
                      >
                        <SelectTrigger><SelectValue placeholder="No category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">No category</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="editPartNumber">Part Number</Label>
                      <Input
                        id="editPartNumber"
                        value={editForm.partNumber}
                        onChange={(e) => setEditForm((p) => ({ ...p, partNumber: e.target.value }))}
                        disabled={saving}
                        placeholder="e.g. OEM-12345"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="editUom">UOM</Label>
                      <Input
                        id="editUom"
                        value={editForm.uom}
                        onChange={(e) => setEditForm((p) => ({ ...p, uom: e.target.value }))}
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="editUnitCost">Unit Cost</Label>
                      <Input
                        id="editUnitCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.unitCost}
                        onChange={(e) => setEditForm((p) => ({ ...p, unitCost: e.target.value }))}
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="editMinStock">Min Stock</Label>
                      <Input
                        id="editMinStock"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.minStock}
                        onChange={(e) => setEditForm((p) => ({ ...p, minStock: e.target.value }))}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}
                      disabled={saving}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="editDescription">Description</Label>
                    <textarea
                      id="editDescription"
                      value={editForm.description}
                      onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      disabled={saving}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
                    />
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving && <LoadingSpinner className="mr-2" />}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </PermissionGuard>
        </div>
      )}

      {activeTab === "transactions" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit Cost</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Work Order</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(tx.createdAt), "dd MMM yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tx.type === "RECEIPT" ? "text-green-600" : "text-red-600"}`}>
                            {tx.type === "RECEIPT" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={tx.type === "RECEIPT" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {tx.type === "RECEIPT" ? "+" : "-"}{tx.quantity.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {tx.unitCost != null
                            ? `${currency} ${tx.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {tx.reference
                            ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{tx.reference}</code>
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {tx.workOrder
                            ? <span className="text-xs">{tx.workOrder.reference}</span>
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{tx.notes ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
