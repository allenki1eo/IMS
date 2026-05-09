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

interface Branch { id: string; name: string; }

interface FormData {
  name: string;
  code: string;
  fuelType: string;
  capacity: string;
  initialLevel: string;
  minLevel: string;
  branchId: string;
  notes: string;
}

const DEFAULT: FormData = {
  name: "",
  code: "",
  fuelType: "DIESEL",
  capacity: "",
  initialLevel: "0",
  minLevel: "0",
  branchId: "",
  notes: "",
};

const FUEL_TYPES = [
  { value: "DIESEL", label: "Diesel" },
  { value: "PETROL", label: "Petrol" },
  { value: "PETROL_95", label: "Petrol 95" },
  { value: "PETROL_93", label: "Petrol 93" },
  { value: "ELECTRIC", label: "Electric" },
];

export default function NewTankPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    fetch("/api/branches?pageSize=200")
      .then((r) => r.json())
      .then((d) => setBranches(d.data ?? []))
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    if (name === "code") {
      setForm((prev) => ({ ...prev, code: value.toUpperCase() }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  function handleSelect(name: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [name]: value === "__none" ? "" : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.code || !form.fuelType || !form.capacity) {
      toast.error("Name, code, fuel type, and capacity are required");
      return;
    }
    const capacityNum = parseFloat(form.capacity);
    const initialLevelNum = parseFloat(form.initialLevel) || 0;
    const minLevelNum = parseFloat(form.minLevel) || 0;
    if (isNaN(capacityNum) || capacityNum <= 0) {
      toast.error("Capacity must be a positive number");
      return;
    }
    if (initialLevelNum > capacityNum) {
      toast.error("Initial level cannot exceed capacity");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fuel-tanks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          fuelType: form.fuelType,
          capacity: capacityNum,
          currentLevel: initialLevelNum,
          minLevel: minLevelNum,
          branchId: form.branchId || undefined,
          notes: form.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create tank"); return; }
      toast.success("Tank created successfully");
      router.push(`/fuel/tanks/${json.data?.id ?? ""}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Add Fuel Tank"
        description="Register a new fuel storage tank"
        actions={
          <Button variant="outline" asChild>
            <Link href="/fuel/tanks">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Tank Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Main Diesel Tank"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="code">Code <span className="text-destructive">*</span></Label>
                <Input
                  id="code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="e.g. TK-001"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Fuel Type <span className="text-destructive">*</span></Label>
              <Select value={form.fuelType} onValueChange={(v) => handleSelect("fuelType", v)} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="capacity">Capacity (L) <span className="text-destructive">*</span></Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.capacity}
                  onChange={handleChange}
                  placeholder="e.g. 10000"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="initialLevel">Initial Level (L)</Label>
                <Input
                  id="initialLevel"
                  name="initialLevel"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.initialLevel}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="minLevel">Min Level (L)</Label>
                <Input
                  id="minLevel"
                  name="minLevel"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minLevel}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Branch</Label>
              <Select value={form.branchId || "__none"} onValueChange={(v) => handleSelect("branchId", v)} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                disabled={submitting}
                placeholder="Optional notes about this tank..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Tank
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/fuel/tanks">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
