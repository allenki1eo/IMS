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

interface Branch { id: string; name: string; }

const WAREHOUSE_TYPES = ["MAIN", "DAYSTORE", "COLD_STORAGE", "PRODUCTION_FLOOR"];

interface FormState {
  name: string;
  code: string;
  branchId: string;
  address: string;
  managerEmployeeId: string;
  warehouseType: string;
}

const DEFAULT: FormState = {
  name: "",
  code: "",
  branchId: "",
  address: "",
  managerEmployeeId: "",
  warehouseType: "MAIN",
};

export default function NewWarehousePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULT);
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
    setForm((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and Code are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          branchId: form.branchId || undefined,
          address: form.address || undefined,
          managerEmployeeId: form.managerEmployeeId || undefined,
          warehouseType: form.warehouseType || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create warehouse"); return; }
      toast.success("Warehouse created");
      router.push(`/warehouse/warehouses/${json.data?.id ?? json.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Warehouse"
        description="Create a new warehouse location"
        actions={
          <Button variant="outline" asChild>
            <Link href="/warehouse/warehouses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Warehouse Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Main Store"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="e.g. WH-001"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Branch</Label>
              <Select
                value={form.branchId || "__none"}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, branchId: v === "__none" ? "" : v }))
                }
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Physical address"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="managerEmployeeId">Manager Employee ID</Label>
              <Input
                id="managerEmployeeId"
                name="managerEmployeeId"
                value={form.managerEmployeeId}
                onChange={handleChange}
                placeholder="Optional — employee ID of the manager"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label>Warehouse Type</Label>
              <Select
                value={form.warehouseType}
                onValueChange={(v) => setForm((prev) => ({ ...prev, warehouseType: v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WAREHOUSE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Warehouse
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/warehouse/warehouses">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
