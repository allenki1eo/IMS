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
  systemQty: string;
  countedQty: string;
  loadingSystemQty: boolean;
}

function newLine(): LineItem {
  return {
    key: crypto.randomUUID(),
    itemId: "",
    locationId: "",
    systemQty: "",
    countedQty: "",
    loadingSystemQty: false,
  };
}

const REASONS = [
  { value: "CYCLE_COUNT", label: "Cycle Count" },
  { value: "DAMAGE", label: "Damage" },
  { value: "EXPIRY", label: "Expiry" },
  { value: "FOUND", label: "Found" },
  { value: "OTHER", label: "Other" },
];

export default function NewAdjustmentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [warehouseId, setWarehouseId] = useState("");
  const [reason, setReason] = useState("CYCLE_COUNT");
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

  async function fetchSystemQty(lineKey: string, itemId: string, locationId: string) {
    if (!itemId || !warehouseId) return;
    setLines((prev) =>
      prev.map((l) => l.key === lineKey ? { ...l, loadingSystemQty: true, systemQty: "" } : l)
    );
    try {
      const params = new URLSearchParams({ itemId, warehouseId });
      if (locationId) params.set("locationId", locationId);
      const res = await fetch(`/api/stock/balance?${params}`);
      const json = await res.json();
      const qty = json.data?.[0]?.quantity ?? json.quantity ?? 0;
      setLines((prev) =>
        prev.map((l) => l.key === lineKey ? { ...l, systemQty: String(qty), loadingSystemQty: false } : l)
      );
    } catch {
      setLines((prev) =>
        prev.map((l) => l.key === lineKey ? { ...l, loadingSystemQty: false } : l)
      );
    }
  }

  function updateLine(key: string, field: keyof LineItem, value: string) {
    setLines((prev) => {
      const updated = prev.map((l) => (l.key === key ? { ...l, [field]: value } : l));
      // If item or location changed, refresh system qty
      if (field === "itemId" || field === "locationId") {
        const line = updated.find((l) => l.key === key);
        if (line) {
          fetchSystemQty(key, line.itemId, line.locationId);
        }
      }
      return updated;
    });
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!warehouseId) { toast.error("Please select a warehouse"); return; }
    const validLines = lines.filter((l) => l.itemId && l.countedQty !== "");
    if (validLines.length === 0) { toast.error("Add at least one item line with a counted qty"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/stock-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          reason,
          notes: notes || undefined,
          lines: validLines.map((l) => ({
            itemId: l.itemId,
            locationId: l.locationId || undefined,
            systemQty: l.systemQty ? Number(l.systemQty) : 0,
            countedQty: Number(l.countedQty),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create adjustment"); return; }
      toast.success("Adjustment created");
      router.push(`/warehouse/adjustments/${json.data?.id ?? json.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Stock Adjustment"
        description="Correct inventory levels after a count or discrepancy"
        actions={
          <Button variant="outline" asChild>
            <Link href="/warehouse/adjustments">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adjustment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  Warehouse <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={warehouseId || "__none"}
                  onValueChange={(v) => setWarehouseId(v === "__none" ? "" : v)}
                  disabled={submitting}
                >
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select warehouse</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Select value={reason} onValueChange={setReason} disabled={submitting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="adj-notes">Notes</Label>
              <Input
                id="adj-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                disabled={submitting}
              />
            </div>
          </CardContent>
        </Card>

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
            {lines.map((line, idx) => {
              const diff =
                line.countedQty !== "" && line.systemQty !== ""
                  ? Number(line.countedQty) - Number(line.systemQty)
                  : null;

              return (
                <div key={line.key}>
                  {idx > 0 && <Separator className="mb-4" />}
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
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
                        <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Any</SelectItem>
                          {locations.map((l) => (
                            <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>System Qty</Label>
                      <Input
                        value={line.loadingSystemQty ? "Loading..." : (line.systemQty || "—")}
                        readOnly
                        className="bg-muted text-muted-foreground"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Counted Qty <span className="text-destructive">*</span></Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={line.countedQty}
                          onChange={(e) => updateLine(line.key, "countedQty", e.target.value)}
                          placeholder="0"
                          disabled={submitting}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(line.key)}
                          disabled={submitting || lines.length === 1}
                          className="text-destructive hover:text-destructive flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {diff !== null && (
                        <p
                          className={`text-xs font-medium mt-1 ${
                            diff === 0
                              ? "text-muted-foreground"
                              : diff > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          Difference: {diff > 0 ? "+" : ""}{diff}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting && <LoadingSpinner className="mr-2" />}
            Create Adjustment
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/warehouse/adjustments">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
