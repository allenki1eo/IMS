"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Check } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Buyer {
  id: string;
  name: string;
}

interface LotOption {
  id: string;
  lotNumber: string;
  totalWeight: number;
  baleCount: number;
  season: { name: string };
  status: string;
}

export default function NewContractPage() {
  const router = useRouter();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [lots, setLots] = useState<LotOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    buyerId: "",
    pricePerKg: "",
    currency: "USD",
    notes: "",
    contractDate: new Date().toISOString().split("T")[0],
  });
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/cotton/buyers")
      .then((r) => r.json())
      .then((d) => { if (d.success) setBuyers(d.data); });

    fetch("/api/cotton/lots?status=OPEN&pageSize=100")
      .then((r) => r.json())
      .then((d) => { if (d.success) setLots(d.data); });
  }, []);

  function toggleLot(lotId: string) {
    setSelectedLotIds((prev) =>
      prev.includes(lotId) ? prev.filter((id) => id !== lotId) : [...prev, lotId]
    );
  }

  const selectedLots = lots.filter((l) => selectedLotIds.includes(l.id));
  const totalWeight = selectedLots.reduce((s, l) => s + l.totalWeight, 0);
  const pricePerKg = parseFloat(form.pricePerKg) || 0;
  const totalAmount = totalWeight * pricePerKg;

  async function handleSubmit() {
    if (!form.buyerId) { toast.error("Buyer is required"); return; }
    if (!form.pricePerKg || pricePerKg <= 0) { toast.error("Price per kg must be greater than 0"); return; }
    if (selectedLotIds.length === 0) { toast.error("Select at least one lot"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/cotton/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId: form.buyerId,
          pricePerKg,
          currency: form.currency,
          lotIds: selectedLotIds,
          notes: form.notes || null,
          contractDate: form.contractDate,
        }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("Contract created");
        router.push(`/cotton/contracts/${d.data.id}`);
      } else {
        toast.error(d.error ?? "Failed to create contract");
      }
    } catch {
      toast.error("Failed to create contract");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Cotton Contract"
        description="Create a new sales contract with a buyer"
        actions={
          <Button variant="outline" asChild>
            <Link href="/cotton/contracts"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Details */}
          <Card>
            <CardHeader><CardTitle className="text-base">Contract Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Buyer *</Label>
                <Select value={form.buyerId} onValueChange={(v) => setForm({ ...form, buyerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select buyer" /></SelectTrigger>
                  <SelectContent>
                    {buyers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {buyers.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No buyers yet. <Link href="/cotton/buyers" className="underline">Create one first.</Link>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price per kg (USD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.pricePerKg}
                    onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })}
                    placeholder="0.75"
                  />
                </div>
                <div>
                  <Label>Contract Date</Label>
                  <Input
                    type="date"
                    value={form.contractDate}
                    onChange={(e) => setForm({ ...form, contractDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional contract notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lot Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Select Lots ({selectedLotIds.length} selected)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No open lots available. <Link href="/cotton/lots" className="underline">Create lots first.</Link>
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {lots.map((lot) => (
                    <label
                      key={lot.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedLotIds.includes(lot.id) ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLotIds.includes(lot.id)}
                        onChange={() => toggleLot(lot.id)}
                        className="sr-only"
                      />
                      <div className={`h-4 w-4 rounded flex items-center justify-center border ${selectedLotIds.includes(lot.id) ? "bg-primary border-primary" : "border-input"}`}>
                        {selectedLotIds.includes(lot.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{lot.lotNumber}</code>
                          <span className="text-xs text-muted-foreground">{lot.season.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {lot.baleCount} bales · {lot.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                        </div>
                      </div>
                      {pricePerKg > 0 && (
                        <span className="text-sm font-medium">
                          ${(lot.totalWeight * pricePerKg).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Contract Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lots selected</span>
                <span className="font-medium">{selectedLotIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total weight</span>
                <span className="font-medium">{totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price per kg</span>
                <span className="font-medium">${pricePerKg.toFixed(4)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between text-base">
                <span className="font-semibold">Total Amount</span>
                <span className="font-bold text-primary">${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={saving || !form.buyerId || selectedLotIds.length === 0 || !form.pricePerKg}
          >
            {saving ? "Creating..." : "Create Contract"}
          </Button>
        </div>
      </div>
    </div>
  );
}
