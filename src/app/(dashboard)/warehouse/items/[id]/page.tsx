"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Item {
  id: string;
  code: string;
  name: string;
  description: string | null;
  itemType: string;
  isActive: boolean;
  minStock: number | null;
  maxStock: number | null;
  reorderPoint: number | null;
  category?: { id: string; name: string } | null;
  uom?: { id: string; name: string; symbol: string } | null;
}

interface Category { id: string; name: string; }
interface UOM { id: string; name: string; symbol: string; }

interface StockBalance {
  id: string;
  warehouseName: string;
  locationName: string | null;
  quantity: number;
  uomSymbol: string;
}

interface LedgerEntry {
  id: string;
  createdAt: string;
  transactionType: string;
  quantity: number;
  warehouseName: string;
  reference: string | null;
}

const ITEM_TYPES = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "FINISHED_GOOD", label: "Finished Good" },
  { value: "CONSUMABLE", label: "Consumable" },
  { value: "SPARE_PART", label: "Spare Part" },
  { value: "PACKAGING", label: "Packaging" },
];

const TABS = ["Stock Levels", "Stock History"] as const;
type Tab = (typeof TABS)[number];

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Stock Levels");
  const [stockBalances, setStockBalances] = useState<StockBalance[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [stockLoading, setStockLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    itemType: "RAW_MATERIAL",
    categoryId: "",
    uomId: "",
    minStock: "",
    maxStock: "",
    reorderPoint: "",
  });

  const fetchItem = useCallback(async () => {
    try {
      const res = await fetch(`/api/items/${id}`);
      const json = await res.json();
      const it = json.data ?? json;
      setItem(it);
      setForm({
        name: it.name ?? "",
        description: it.description ?? "",
        itemType: it.itemType ?? "RAW_MATERIAL",
        categoryId: it.category?.id ?? "",
        uomId: it.uom?.id ?? "",
        minStock: it.minStock != null ? String(it.minStock) : "",
        maxStock: it.maxStock != null ? String(it.maxStock) : "",
        reorderPoint: it.reorderPoint != null ? String(it.reorderPoint) : "",
      });
    } catch {
      toast.error("Failed to load item");
    }
  }, [id]);

  useEffect(() => {
    Promise.all([
      fetchItem(),
      fetch("/api/item-categories?pageSize=200").then((r) => r.json()).then((d) => setCategories(d.data ?? [])),
      fetch("/api/uoms?pageSize=200").then((r) => r.json()).then((d) => setUoms(d.data ?? [])),
    ]).finally(() => setLoading(false));
  }, [fetchItem]);

  useEffect(() => {
    if (activeTab === "Stock Levels") {
      setStockLoading(true);
      fetch(`/api/stock/balance?itemId=${id}`)
        .then((r) => r.json())
        .then((d) => setStockBalances(d.data ?? []))
        .catch(() => toast.error("Failed to load stock"))
        .finally(() => setStockLoading(false));
    } else {
      setStockLoading(true);
      fetch(`/api/stock/ledger?itemId=${id}&pageSize=50`)
        .then((r) => r.json())
        .then((d) => setLedger(d.data ?? []))
        .catch(() => toast.error("Failed to load ledger"))
        .finally(() => setStockLoading(false));
    }
  }, [activeTab, id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.uomId) {
      toast.error("Name and UOM are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          itemType: form.itemType,
          categoryId: form.categoryId || undefined,
          uomId: form.uomId,
          minStock: form.minStock ? Number(form.minStock) : undefined,
          maxStock: form.maxStock ? Number(form.maxStock) : undefined,
          reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update"); return; }
      toast.success("Item updated");
      fetchItem();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!item) return <div className="text-muted-foreground">Item not found.</div>;

  return (
    <div>
      <PageHeader
        title={item.name}
        description={`Code: ${item.code}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/warehouse/items">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <PermissionGuard require="warehouse:item:update">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Item Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    disabled={saving}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Item Type</Label>
                    <Select
                      value={form.itemType}
                      onValueChange={(v) => setForm((p) => ({ ...p, itemType: v }))}
                      disabled={saving}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Select
                      value={form.categoryId || "__none"}
                      onValueChange={(v) =>
                        setForm((p) => ({ ...p, categoryId: v === "__none" ? "" : v }))
                      }
                      disabled={saving}
                    >
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Unit of Measure <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.uomId || "__none"}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, uomId: v === "__none" ? "" : v }))
                    }
                    disabled={saving}
                  >
                    <SelectTrigger><SelectValue placeholder="Select UOM" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Select UOM</SelectItem>
                      {uoms.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="minStock">Min Stock</Label>
                    <Input
                      id="minStock"
                      type="number"
                      min="0"
                      value={form.minStock}
                      onChange={(e) => setForm((p) => ({ ...p, minStock: e.target.value }))}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="maxStock">Max Stock</Label>
                    <Input
                      id="maxStock"
                      type="number"
                      min="0"
                      value={form.maxStock}
                      onChange={(e) => setForm((p) => ({ ...p, maxStock: e.target.value }))}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reorderPoint">Reorder Point</Label>
                    <Input
                      id="reorderPoint"
                      type="number"
                      min="0"
                      value={form.reorderPoint}
                      onChange={(e) => setForm((p) => ({ ...p, reorderPoint: e.target.value }))}
                      disabled={saving}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving && <LoadingSpinner className="mr-2" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </PermissionGuard>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={item.isActive} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="secondary">
                  {ITEM_TYPES.find((t) => t.value === item.itemType)?.label ?? item.itemType}
                </Badge>
              </div>
              {item.uom && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">UOM</span>
                  <span className="font-medium">{item.uom.symbol}</span>
                </div>
              )}
              {item.category && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{item.category.name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-4 flex gap-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Stock Levels" && (
        <div>
          {stockLoading ? (
            <LoadingState />
          ) : stockBalances.length === 0 ? (
            <p className="text-muted-foreground text-sm">No stock balance found for this item.</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Warehouse</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quantity</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {stockBalances.map((s) => (
                    <tr key={s.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">{s.warehouseName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.locationName ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold">{s.quantity}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.uomSymbol}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "Stock History" && (
        <div>
          {stockLoading ? (
            <LoadingState />
          ) : ledger.length === 0 ? (
            <p className="text-muted-foreground text-sm">No stock history found.</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Warehouse</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((l) => (
                    <tr key={l.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(l.createdAt), "dd MMM yyyy HH:mm")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{l.transactionType}</Badge>
                      </td>
                      <td className={`px-4 py-3 font-semibold ${l.quantity >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {l.quantity >= 0 ? "+" : ""}{l.quantity}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{l.warehouseName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.reference ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
