"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Info } from "lucide-react";
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

export default function NewDriverPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    licenseNumber: "",
    licenseClass: "",
    licenseExpiry: "",
    medicalExpiry: "",
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeId.trim()) { toast.error("Employee ID is required"); return; }
    if (!form.licenseNumber.trim()) { toast.error("License number is required"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId.trim(),
          licenseNumber: form.licenseNumber.trim(),
          licenseClass: form.licenseClass || undefined,
          licenseExpiry: form.licenseExpiry || undefined,
          medicalExpiry: form.medicalExpiry || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to register driver"); return; }
      toast.success("Driver registered successfully");
      router.push(`/transport/drivers/${json.data?.id ?? json.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Register Driver"
        description="Register an employee as a fleet driver"
        actions={
          <Button variant="outline" asChild>
            <Link href="/transport/drivers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="max-w-2xl">
        <div className="flex items-start gap-2 p-3 mb-6 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-sm">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Only employees with the Driver flag enabled can be registered as drivers. Ensure the employee record has the driver flag set before registering.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Driver Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="employeeId">
                  Employee ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="employeeId"
                  value={form.employeeId}
                  onChange={(e) => set("employeeId", e.target.value)}
                  placeholder="Employee ID (UUID)"
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the employee&apos;s system ID. In a future release this will be a searchable dropdown.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="licenseNumber">
                  License Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="licenseNumber"
                  value={form.licenseNumber}
                  onChange={(e) => set("licenseNumber", e.target.value)}
                  placeholder="e.g. DL123456"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1">
                <Label>License Class</Label>
                <Select value={form.licenseClass || "__none"} onValueChange={(v) => set("licenseClass", v === "__none" ? "" : v)} disabled={submitting}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Not specified</SelectItem>
                    <SelectItem value="A">Class A</SelectItem>
                    <SelectItem value="B">Class B</SelectItem>
                    <SelectItem value="C">Class C</SelectItem>
                    <SelectItem value="D">Class D</SelectItem>
                    <SelectItem value="EC">Class EC</SelectItem>
                    <SelectItem value="EC+E">Class EC+E</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="licenseExpiry">License Expiry</Label>
                  <Input
                    id="licenseExpiry"
                    type="date"
                    value={form.licenseExpiry}
                    onChange={(e) => set("licenseExpiry", e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="medicalExpiry">Medical Expiry</Label>
                  <Input
                    id="medicalExpiry"
                    type="date"
                    value={form.medicalExpiry}
                    onChange={(e) => set("medicalExpiry", e.target.value)}
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
                  placeholder="Optional notes"
                  disabled={submitting}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting && <LoadingSpinner className="mr-2" />}
              Register Driver
            </Button>
            <Button variant="outline" type="button" asChild>
              <Link href="/transport/drivers">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
