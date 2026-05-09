"use client";

import { useEffect, useState } from "react";
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
import { FUEL_TYPES } from "../../_components/fuel-ui";

interface Branch {
  id: string;
  name: string;
}

export default function NewFuelTankPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    branchId: "",
    fuelType: "DIESEL",
    capacity: "",
    currentLevel: "",
    minLevel: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/branches?pageSize=200")
      .then((res) => res.json())
      .then((json) => setBranches(json.data ?? []))
      .catch(() => {});
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: field === "code" ? value.toUpperCase() : value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) { toast.error("Tank name is required"); return; }
    if (!form.code.trim()) { toast.error("Tank code is required"); return; }
    if (!form.capacity || Number(form.capacity) <= 0) { toast.error("Capacity must be greater than zero"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fuel-tanks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim(),
          branchId: form.branchId || undefined,
          fuelType: form.fuelType,
          capacity: Number(form.capacity),
          currentLevel: form.currentLevel ? Number(form.currentLevel) : 0,
          minLevel: form.minLevel ? Number(form.minLevel) : 0,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create tank"); return; }
      toast.success("Fuel tank created");
      router.push(`/fuel/tanks/${json.data?.id ?? json.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Fuel Tank"
        description="Create a tank for receiving and issuing fuel"
        actions={
          <Button variant="outline" asChild>
            <Link href="/fuel/tanks">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Tank Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} disabled={submitting} placeholder="Main diesel tank" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="code">Code <span className="text-destructive">*</span></Label>
                <Input id="code" value={form.code} onChange={(e) => set("code", e.target.value)} disabled={submitting} placeholder="FT-001" />
              </div>
              <div className="space-y-1">
                <Label>Fuel Type</Label>
                <Select value={form.fuelType} onValueChange={(value) => set("fuelType", value)} disabled={submitting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Branch</Label>
                <Select value={form.branchId || "__none"} onValueChange={(value) => set("branchId", value === "__none" ? "" : value)} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="capacity">Capacity (liters) <span className="text-destructive">*</span></Label>
                <Input id="capacity" type="number" min="0" step="0.01" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} disabled={submitting} placeholder="10000" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="currentLevel">Opening Level (liters)</Label>
                <Input id="currentLevel" type="number" min="0" step="0.01" value={form.currentLevel} onChange={(e) => set("currentLevel", e.target.value)} disabled={submitting} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="minLevel">Minimum Level (liters)</Label>
                <Input id="minLevel" type="number" min="0" step="0.01" value={form.minLevel} onChange={(e) => set("minLevel", e.target.value)} disabled={submitting} placeholder="1000" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} disabled={submitting} placeholder="Optional notes" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Tank
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/fuel/tanks">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

