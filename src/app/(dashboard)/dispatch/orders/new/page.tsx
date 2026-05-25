"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
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

interface VehicleOption {
  id: string;
  plateNumber: string;
  make?: string | null;
  model?: string | null;
}

interface DriverOption {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  licenseNumber?: string | null;
  employee?: { fullName: string } | null;
}

interface FormData {
  customerName: string;
  customerContact: string;
  deliveryAddress: string;
  scheduledDate: string;
  vehicleId: string;
  driverId: string;
  notes: string;
}

export default function NewDispatchOrderPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    customerName: "",
    customerContact: "",
    deliveryAddress: "",
    scheduledDate: "",
    vehicleId: "",
    driverId: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles?pageSize=200").then((r) => r.json()),
      fetch("/api/drivers?status=ACTIVE&pageSize=200").then((r) => r.json()),
    ])
      .then(([vData, dData]) => {
        setVehicles(vData.data ?? []);
        setDrivers(dData.data ?? []);
      })
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/dispatch/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerContact: form.customerContact.trim() || undefined,
          deliveryAddress: form.deliveryAddress.trim() || undefined,
          scheduledDate: form.scheduledDate || undefined,
          vehicleId: form.vehicleId || undefined,
          driverId: form.driverId || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create order"); return; }
      toast.success("Dispatch order created");
      router.push(`/dispatch/orders/${json.data?.id ?? ""}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Dispatch Order"
        description="Create a finished goods dispatch order"
        actions={
          <Button variant="outline" asChild>
            <Link href="/dispatch/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="customerName">Customer Name <span className="text-destructive">*</span></Label>
              <Input
                id="customerName"
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="e.g. ABC Distributors"
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="customerContact">Customer Contact (optional)</Label>
              <Input
                id="customerContact"
                name="customerContact"
                value={form.customerContact}
                onChange={handleChange}
                placeholder="e.g. +1234567890 or email"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="deliveryAddress">Delivery Address (optional)</Label>
              <textarea
                id="deliveryAddress"
                name="deliveryAddress"
                value={form.deliveryAddress}
                onChange={handleChange}
                rows={3}
                disabled={submitting}
                placeholder="Full delivery address..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="scheduledDate">Scheduled Date (optional)</Label>
              <Input
                id="scheduledDate"
                name="scheduledDate"
                type="date"
                value={form.scheduledDate}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label>Vehicle (optional)</Label>
              <Select
                value={form.vehicleId || "__none"}
                onValueChange={(v) => setForm((p) => ({ ...p, vehicleId: v === "__none" ? "" : v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No vehicle</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plateNumber}{v.make ? ` — ${v.make}` : ""}{v.model ? ` ${v.model}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Driver (optional)</Label>
              <Select
                value={form.driverId || "__none"}
                onValueChange={(v) => setForm((p) => ({ ...p, driverId: v === "__none" ? "" : v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No driver</SelectItem>
                  {drivers.map((d) => {
                    const name = d.employee?.fullName ?? [d.firstName, d.lastName].filter(Boolean).join(" ") ?? "Unnamed driver";
                    return (
                      <SelectItem key={d.id} value={d.id}>
                        {name}{d.licenseNumber ? ` (${d.licenseNumber})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                disabled={submitting}
                placeholder="Any additional notes..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Order
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/dispatch/orders">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
