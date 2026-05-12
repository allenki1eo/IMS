"use client";

import { useState } from "react";
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

export default function NewVehiclePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    plateNumber: "",
    make: "",
    model: "",
    year: "",
    vehicleType: "",
    usageType: "",
    fuelType: "",
    capacity: "",
    fuelTankCapacity: "",
    color: "",
    chassisNo: "",
    engineNo: "",
    initialOdometer: "",
    insuranceExpiry: "",
    roadWorthyExpiry: "",
    nextServiceDate: "",
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.plateNumber.trim()) { toast.error("Plate number is required"); return; }
    if (!form.make.trim()) { toast.error("Make is required"); return; }
    if (!form.model.trim()) { toast.error("Model is required"); return; }
    if (!form.vehicleType) { toast.error("Vehicle type is required"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber: form.plateNumber.trim().toUpperCase(),
          make: form.make.trim(),
          model: form.model.trim(),
          year: form.year ? Number(form.year) : undefined,
          vehicleType: form.vehicleType,
          usageType: form.usageType || undefined,
          fuelType: form.fuelType || undefined,
          capacity: form.capacity ? Number(form.capacity) : undefined,
          fuelTankCapacity: form.fuelTankCapacity ? Number(form.fuelTankCapacity) : undefined,
          color: form.color.trim() || undefined,
          chassisNo: form.chassisNo.trim() || undefined,
          engineNo: form.engineNo.trim() || undefined,
          initialOdometer: form.initialOdometer ? Number(form.initialOdometer) : undefined,
          insuranceExpiry: form.insuranceExpiry || undefined,
          roadWorthyExpiry: form.roadWorthyExpiry || undefined,
          nextServiceDate: form.nextServiceDate || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create vehicle"); return; }
      toast.success("Vehicle added to fleet");
      router.push(`/transport/vehicles/${json.data?.id ?? json.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Add Vehicle"
        description="Register a new vehicle to the fleet"
        actions={
          <Button variant="outline" asChild>
            <Link href="/transport/vehicles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="plateNumber">
                  Plate Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="plateNumber"
                  value={form.plateNumber}
                  onChange={(e) => set("plateNumber", e.target.value)}
                  placeholder="e.g. ABC 123"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="make">
                  Make <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="make"
                  value={form.make}
                  onChange={(e) => set("make", e.target.value)}
                  placeholder="e.g. Toyota"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="model">
                  Model <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="model"
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                  placeholder="e.g. Hilux"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={form.year}
                  onChange={(e) => set("year", e.target.value)}
                  placeholder="e.g. 2022"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Vehicle Type <span className="text-destructive">*</span>
                </Label>
                <Select value={form.vehicleType || "__none"} onValueChange={(v) => set("vehicleType", v === "__none" ? "" : v)} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select type</SelectItem>
                    <SelectItem value="TRUCK">Truck</SelectItem>
                    <SelectItem value="VAN">Van</SelectItem>
                    <SelectItem value="CAR">Car</SelectItem>
                    <SelectItem value="MOTORCYCLE">Motorcycle</SelectItem>
                    <SelectItem value="TRAILER">Trailer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Usage Type</Label>
                <Select value={form.usageType || "__none"} onValueChange={(v) => set("usageType", v === "__none" ? "" : v)} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Select usage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select usage</SelectItem>
                    <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                    <SelectItem value="TRAVEL">Travel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fuel Type</Label>
                <Select value={form.fuelType || "__none"} onValueChange={(v) => set("fuelType", v === "__none" ? "" : v)} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Select fuel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Not specified</SelectItem>
                    <SelectItem value="DIESEL">Diesel</SelectItem>
                    <SelectItem value="PETROL">Petrol</SelectItem>
                    <SelectItem value="ELECTRIC">Electric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="capacity">Capacity (tons)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.capacity}
                  onChange={(e) => set("capacity", e.target.value)}
                  placeholder="e.g. 5.0"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fuelTankCapacity">Fuel Tank Capacity (L)</Label>
                <Input
                  id="fuelTankCapacity"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.fuelTankCapacity}
                  onChange={(e) => set("fuelTankCapacity", e.target.value)}
                  placeholder="e.g. 60"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={form.color}
                  onChange={(e) => set("color", e.target.value)}
                  placeholder="e.g. White"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="chassisNo">Chassis No</Label>
                <Input
                  id="chassisNo"
                  value={form.chassisNo}
                  onChange={(e) => set("chassisNo", e.target.value)}
                  placeholder="Chassis number"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="engineNo">Engine No</Label>
                <Input
                  id="engineNo"
                  value={form.engineNo}
                  onChange={(e) => set("engineNo", e.target.value)}
                  placeholder="Engine number"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="initialOdometer">Initial Odometer (km)</Label>
                <Input
                  id="initialOdometer"
                  type="number"
                  min="0"
                  value={form.initialOdometer}
                  onChange={(e) => set("initialOdometer", e.target.value)}
                  placeholder="0"
                  disabled={submitting}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents & Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="insuranceExpiry">Insurance Expiry</Label>
                <Input
                  id="insuranceExpiry"
                  type="date"
                  value={form.insuranceExpiry}
                  onChange={(e) => set("insuranceExpiry", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="roadWorthyExpiry">Road Worthy Expiry</Label>
                <Input
                  id="roadWorthyExpiry"
                  type="date"
                  value={form.roadWorthyExpiry}
                  onChange={(e) => set("roadWorthyExpiry", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nextServiceDate">Next Service Date</Label>
                <Input
                  id="nextServiceDate"
                  type="date"
                  value={form.nextServiceDate}
                  onChange={(e) => set("nextServiceDate", e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Optional notes about this vehicle"
                disabled={submitting}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting && <LoadingSpinner className="mr-2" />}
            Add Vehicle
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/transport/vehicles">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
