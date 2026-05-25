"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Warehouse { id: string; name: string; }
interface Item { id: string; code: string; name: string; }
interface Location { id: string; name: string; code: string; }

interface LineItem {
  key: string;
  itemId: string;
  locationId: string;
  quantity: string;
  unitCost: string;
}

function newLine(): LineItem {
  return { key: crypto.randomUUID(), itemId: "", locationId: "", quantity: "", unitCost: "" };
}

export default function NewGRNPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [warehouseId, setWarehouseId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([newLine()]);

  useEffect(() => {
    Promise.all([
      fetch("/api/warehouses?pageSize=200").then((r) => r.json()),
      fetch("/api/items?pageSize=500&isActive=true").then((r) => r.json()),
    ])
      .then(([whJson, itemJson]) => {
        setWarehouses(whJson.data ?? []);
        setItems(itemJson.data ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!warehouseId) { setLocations([]); return; }
    fetch(`/api/warehouses/${warehouseId}/locations?pageSize=200`)
      .then((r) => r.json())
      .then((d) => setLocations(d.data ?? d ?? []))
      .catch(() => {});
  }, [warehouseId]);

  function updateLine(key: string, field: keyof LineItem, value: string) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, [field]: value } : l))
    );
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!warehouseId) { toast.error("Please select a warehouse"); return; }
    const validLines = lines.filter((l) => l.itemId && l.quantity);
    if (validLines.length === 0) { toast.error("Add at least one item line"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/grns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          supplierName: supplierName || undefined,
          supplierRef: supplierRef || undefined,
          notes: notes || undefined,
          lines: validLines.map((l) => ({
            itemId: l.itemId,
            locationId: l.locationId || undefined,
            quantity: Number(l.quantity),
            unitCost: l.unitCost ? Number(l.unitCost) : undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create GRN"); return; }
      toast.success("GRN created");
      router.push(`/warehouse/grn/${json.data?.id ?? json.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New GRN"
        description="Record incoming goods receipt"
        actions={
          <Button variant="outline" asChild>
            <Link href="/warehouse/grn">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">GRN Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Select value={warehouseId || "__none"} onValueChange={(v) => setWarehouseId(v === "__none" ? "" : v)} disabled={submitting}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select warehouse</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="supplierName">Supplier Name</Label>
                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Optional"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="supplierRef">Supplier Reference</Label>
                <Input
                  id="supplierRef"
                  value={supplierRef}
                  onChange={(e) => setSupplierRef(e.target.value)}
                  placeholder="e.g. Invoice number"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                disabled={submitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((p) => [...p, newLine()])}
              disabled={submitting}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Line
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.map((line, idx) => (
              <div key={line.key}>
                {idx > 0 && <Separator className="mb-4" />}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1 lg:col-span-2">
                    <Label>Item <span className="text-destructive">*</span></Label>
                    <Select
                      value={line.itemId || "__none"}
                      onValueChange={(v) => updateLine(line.key, "itemId", v === "__none" ? "" : v)}
                      disabled={submitting}
                    >
                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Select item</SelectItem>
                        {items.map((it) => (
                          <SelectItem key={it.id} value={it.id}>
                            {it.code} — {it.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Location</Label>
                    <Select
                      value={line.locationId || "__none"}
                      onValueChange={(v) => updateLine(line.key, "locationId", v === "__none" ? "" : v)}
                      disabled={submitting || !warehouseId}
                    >
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Qty <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, "quantity", e.target.value)}
                      placeholder="0"
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Unit Cost</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitCost}
                      onChange={(e) => updateLine(line.key, "unitCost", e.target.value)}
                      placeholder="0.00"
                      disabled={submitting}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.key)}
                      disabled={submitting || lines.length === 1}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting && <LoadingSpinner className="mr-2" />}
            Create GRN
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/warehouse/grn">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
