"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function NewStampBatchPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    batchNumber: "",
    stampType: "BEER",
    quantity: "",
    serialFrom: "",
    serialTo: "",
    receivedAt: today(),
    expiresAt: "",
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.batchNumber.trim()) return toast.error("Batch number is required");
    if (!form.quantity || Number(form.quantity) <= 0) return toast.error("Quantity must be greater than 0");

    setSubmitting(true);
    try {
      const res = await fetch("/api/tra-stamps/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchNumber: form.batchNumber.trim(),
          stampType: form.stampType,
          quantity: Number(form.quantity),
          serialFrom: form.serialFrom.trim() || null,
          serialTo: form.serialTo.trim() || null,
          receivedAt: form.receivedAt || null,
          expiresAt: form.expiresAt || null,
          notes: form.notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Failed to create stamp batch");
        return;
      }
      toast.success("Stamp batch received successfully");
      router.push("/tra-stamps/batches");
    } catch {
      toast.error("Failed to create stamp batch");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Receive Stamp Batch"
        description="Record a new TRA stamp batch received from the authority"
      />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Batch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="batchNumber">Batch Number *</Label>
              <Input
                id="batchNumber"
                value={form.batchNumber}
                onChange={(e) => set("batchNumber", e.target.value)}
                placeholder="e.g. TRA-2024-001"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="stampType">Stamp Type *</Label>
              <Select value={form.stampType} onValueChange={(v) => set("stampType", v)}>
                <SelectTrigger id="stampType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEER">Beer</SelectItem>
                  <SelectItem value="SPIRITS">Spirits</SelectItem>
                  <SelectItem value="WINE">Wine</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                placeholder="e.g. 10000"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="serialFrom">Serial From</Label>
                <Input
                  id="serialFrom"
                  value={form.serialFrom}
                  onChange={(e) => set("serialFrom", e.target.value)}
                  placeholder="Starting serial"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="serialTo">Serial To</Label>
                <Input
                  id="serialTo"
                  value={form.serialTo}
                  onChange={(e) => set("serialTo", e.target.value)}
                  placeholder="Ending serial"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="receivedAt">Received Date</Label>
                <Input
                  id="receivedAt"
                  type="date"
                  value={form.receivedAt}
                  onChange={(e) => set("receivedAt", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="expiresAt">Expiry Date</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => set("expiresAt", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Optional notes"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Receive Batch"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/tra-stamps/batches")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
