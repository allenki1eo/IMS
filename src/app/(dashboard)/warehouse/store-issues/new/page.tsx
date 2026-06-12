"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ISSUE_TYPES = [
  { value: "ISSUE_TO_PRODUCTION", label: "Issue to Production", hint: "Deducts stock — raw materials sent to the production floor" },
  { value: "RETURN_FROM_PRODUCTION", label: "Return from Production", hint: "Adds stock — unused materials returned to store" },
  { value: "RETURN_TO_SUPPLIER", label: "Return to Supplier", hint: "Deducts stock — rejected/excess goods sent back" },
  { value: "OTHER_ADDITION", label: "Other Addition", hint: "Adds stock — miscellaneous receipt" },
  { value: "OTHER_DEDUCTION", label: "Other Deduction", hint: "Deducts stock — breakage, sampling, write-off" },
];

interface ItemOption {
  id: string;
  name: string;
  code: string;
  uom?: { symbol: string };
}

interface WarehouseOption {
  id: string;
  name: string;
}

interface LineRow {
  itemId: string;
  quantity: string;
  notes: string;
}

export default function NewStoreIssuePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);

  const [warehouseId, setWarehouseId] = useState("");
  const [issueType, setIssueType] = useState("ISSUE_TO_PRODUCTION");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineRow[]>([{ itemId: "", quantity: "", notes: "" }]);

  useEffect(() => {
    fetch("/api/warehouses?pageSize=100")
      .then((r) => r.json())
      .then((d) => {
        const list = d.data ?? [];
        setWarehouses(list);
        if (list.length === 1) setWarehouseId(list[0].id);
      })
      .catch(() => {});
    fetch("/api/items?pageSize=500&isActive=true")
      .then((r) => r.json())
      .then((d) => setItems(d.data ?? []))
      .catch(() => {});
  }, []);

  const selectedType = ISSUE_TYPES.find((t) => t.value === issueType);

  function updateLine(idx: number, field: keyof LineRow, value: string) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function addLine() { setLines((prev) => [...prev, { itemId: "", quantity: "", notes: "" }]); }
  function removeLine(idx: number) { setLines((prev) => prev.filter((_, i) => i !== idx)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!warehouseId) { toast.error("Warehouse is required"); return; }
    const filled = lines.filter((l) => l.itemId && Number(l.quantity) > 0);
    if (filled.length === 0) { toast.error("Add at least one item with a quantity"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/warehouse/store-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          issueType,
          issueDate,
          destination: destination || undefined,
          notes: notes || undefined,
          lines: filled.map((l) => ({
            itemId: l.itemId,
            quantity: Number(l.quantity),
            notes: l.notes || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? "Failed to save");
      toast.success(`Saved — stock updated (${data.data?.reference ?? ""})`);
      router.push("/warehouse/store-issues");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="New Store Issue / Return"
        description="Stock is updated immediately when saved"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Type *</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedType && <p className="text-xs text-muted-foreground">{selectedType.hint}</p>}
            </div>
            <div className="space-y-1">
              <Label>Warehouse *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Select warehouse..." /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>
                {issueType === "RETURN_TO_SUPPLIER" ? "Supplier" : issueType.includes("PRODUCTION") ? "Production Line / Department" : "Destination / Source"}
              </Label>
              <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Brewhouse, Packaging Line 1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="pb-2 pr-2">Item</th>
                  <th className="pb-2 pr-2 w-32">Quantity</th>
                  <th className="pb-2 pr-2 w-48">Notes</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1 pr-2">
                      <Select value={line.itemId} onValueChange={(v) => updateLine(i, "itemId", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select item..." /></SelectTrigger>
                        <SelectContent>
                          {items.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        type="number" min="0" step="any" className="h-9"
                        value={line.quantity}
                        onChange={(e) => updateLine(i, "quantity", e.target.value)}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input className="h-9" value={line.notes} onChange={(e) => updateLine(i, "notes", e.target.value)} />
                    </td>
                    <td className="py-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addLine}>
              <Plus className="mr-1 h-3 w-3" /> Add Item
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save & Apply to Stock"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
