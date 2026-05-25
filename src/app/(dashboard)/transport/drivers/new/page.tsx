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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NewDriverPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"standalone" | "employee">("standalone");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
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

    if (mode === "standalone" && !form.firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    if (mode === "employee" && !form.employeeId.trim()) {
      toast.error("Employee ID is required");
      return;
    }

    const payload =
      mode === "standalone"
        ? {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim() || undefined,
            phone: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            licenseNumber: form.licenseNumber.trim() || undefined,
            licenseClass: form.licenseClass || undefined,
            licenseExpiry: form.licenseExpiry || undefined,
            medicalExpiry: form.medicalExpiry || undefined,
            notes: form.notes.trim() || undefined,
          }
        : {
            employeeId: form.employeeId.trim(),
            licenseNumber: form.licenseNumber.trim() || undefined,
            licenseClass: form.licenseClass || undefined,
            licenseExpiry: form.licenseExpiry || undefined,
            medicalExpiry: form.medicalExpiry || undefined,
            notes: form.notes.trim() || undefined,
          };

    setSubmitting(true);
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        description="Add a new driver to your fleet"
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
        <Tabs value={mode} onValueChange={(v: string) => setMode(v as "standalone" | "employee")} className="mb-6">
          <TabsList>
            <TabsTrigger value="standalone">New Driver</TabsTrigger>
            <TabsTrigger value="employee">Link to Employee</TabsTrigger>
          </TabsList>
          <TabsContent value="standalone">
            <p className="text-sm text-muted-foreground mt-2">
              Add a driver directly by entering their name and contact details.
            </p>
          </TabsContent>
          <TabsContent value="employee">
            <p className="text-sm text-muted-foreground mt-2">
              Register an existing employee as a fleet driver. The employee must have the Driver flag enabled.
            </p>
          </TabsContent>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {mode === "standalone" ? "Driver Information" : "Employee Reference"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === "standalone" ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="firstName">
                        First Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        value={form.firstName}
                        onChange={(e) => set("firstName", e.target.value)}
                        placeholder="e.g. John"
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={form.lastName}
                        onChange={(e) => set("lastName", e.target.value)}
                        placeholder="e.g. Doe"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="e.g. +1 555 0100"
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="e.g. john@example.com"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </>
              ) : (
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
                    Enter the employee&apos;s system ID from the Employees module.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">License & Medical</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="licenseNumber">License Number</Label>
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
                  <Select
                    value={form.licenseClass || "__none"}
                    onValueChange={(v) => set("licenseClass", v === "__none" ? "" : v)}
                    disabled={submitting}
                  >
                    <SelectTrigger>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
