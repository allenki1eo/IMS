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
  fromLocationId: string;
  toLocationId: string;
  quantity: string;
}

function newLine(): LineItem {
  return { key: crypto.randomUUID(), itemId: "", fromLocationId: "", toLocationId: "", quantity: "" };
}

export default function NewTransferPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [fromLocations, setFromLocations] = useState<Location[]>([]);
  const [toLocations, setToLocations] = useState<Location[]>([]);

  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
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
    if (!fromWarehouseId) { setFromLocations([]); return; }
    fetch(`/api/warehouses/${fromWarehouseId}/locations?pageSize=200`)
      .then((r) => r.json())
      .then((d) => setFromLocations(d.data ?? d ?? []))
      .catch(() => {});
  }, [fromWarehouseId]);

  useEffect(() => {
    if (!toWarehouseId) { setToLocations([]); return; }
    fetch(`/api/warehouses/${toWarehouseId}/locations?pageSize=200`)
      .then((r) => r.json())
      .then((d) => setToLocations(d.data ?? d ?? []))
      .catch(() => {});
  }, [toWarehouseId]);

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
    if (!fromWarehouseId || !toWarehouseId) {
      toast.error("Please select both source and destination warehouses");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error("Source and destination warehouses must be different");
      return;
    }
    const validLines = lines.filter((l) => l.itemId && l.quantity);
    if (validLines.length === 0) { toast.error("Add at least one item line"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId,
          toWarehouseId,
          notes: notes || undefined,
          lines: validLines.map((l) => ({
            itemId: l.itemId,
            fromLocationId: l.fromLocationId || undefined,
            toLocationId: l.toLocationId || undefined,
            quantity: Number(l.quantity),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create transfer"); return; }
      toast.success("Transfer created");
      router.push(`/warehouse/transfers/${json.data?.id ?? json.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Stock Transfer"
        description="Move items between warehouses"
        actions={
          <Button variant="outline" asChild>
            <Link href="/warehouse/transfers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transfer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  From Warehouse <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={fromWarehouseId || "__none"}
                  onValueChange={(v) => setFromWarehouseId(v === "__none" ? "" : v)}
                  disabled={submitting}
                >
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select source</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>
                  To Warehouse <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={toWarehouseId || "__none"}
                  onValueChange={(v) => setToWarehouseId(v === "__none" ? "" : v)}
                  disabled={submitting}
                >
                  <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select destination</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <Label>From Location</Label>
                    <Select
                      value={line.fromLocationId || "__none"}
                      onValueChange={(v) => updateLine(line.key, "fromLocationId", v === "__none" ? "" : v)}
                      disabled={submitting || !fromWarehouseId}
                    >
                      <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Any</SelectItem>
                        {fromLocations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>To Location</Label>
                    <Select
                      value={line.toLocationId || "__none"}
                      onValueChange={(v) => updateLine(line.key, "toLocationId", v === "__none" ? "" : v)}
                      disabled={submitting || !toWarehouseId}
                    >
                      <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Any</SelectItem>
                        {toLocations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Qty <span className="text-destructive">*</span></Label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, "quantity", e.target.value)}
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
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting && <LoadingSpinner className="mr-2" />}
            Create Transfer
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/warehouse/transfers">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
