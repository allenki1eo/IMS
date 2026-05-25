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

interface FormData {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  branchId: string;
  departmentId: string;
  employmentType: string;
  hireDate: string;
  isDriver: boolean;
}

interface Branch { id: string; name: string; }
interface Department { id: string; name: string; }

const DEFAULT: FormData = {
  employeeNumber: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  position: "",
  branchId: "",
  departmentId: "",
  employmentType: "PERMANENT",
  hireDate: "",
  isDriver: false,
};

const EMPLOYMENT_TYPES = [
  { value: "PERMANENT", label: "Permanent" },
  { value: "CONTRACT", label: "Contract" },
  { value: "CASUAL", label: "Casual" },
  { value: "TEMPORARY", label: "Temporary" },
];

export default function NewEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetch("/api/branches?pageSize=200").then((r) => r.json()).then((d) => setBranches(d.data ?? [])).catch(() => {});
    fetch("/api/departments?pageSize=200").then((r) => r.json()).then((d) => setDepartments(d.data ?? [])).catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handleSelect(name: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [name]: value === "__none" ? "" : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.employeeNumber) {
      toast.error("Employee number, first name and last name are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeNumber: form.employeeNumber,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          position: form.position || undefined,
          branchId: form.branchId || undefined,
          departmentId: form.departmentId || undefined,
          employmentType: form.employmentType,
          hireDate: form.hireDate || undefined,
          isDriver: form.isDriver,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create employee"); return; }
      toast.success("Employee created");
      router.push("/employees");
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Add Employee"
        description="Create a new employee record"
        actions={
          <Button variant="outline" asChild>
            <Link href="/employees">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Employee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="employeeNumber">
                Employee Number <span className="text-destructive">*</span>
              </Label>
              <Input id="employeeNumber" name="employeeNumber" value={form.employeeNumber} onChange={handleChange} placeholder="e.g. EMP001" disabled={submitting} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} disabled={submitting} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} disabled={submitting} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} disabled={submitting} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} disabled={submitting} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="position">Position</Label>
              <Input id="position" name="position" value={form.position} onChange={handleChange} placeholder="e.g. Software Engineer" disabled={submitting} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Branch</Label>
                <Select value={form.branchId || "__none"} onValueChange={(v) => handleSelect("branchId", v)} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Select value={form.departmentId || "__none"} onValueChange={(v) => handleSelect("departmentId", v)} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Employment Type</Label>
                <Select value={form.employmentType} onValueChange={(v) => handleSelect("employmentType", v)} disabled={submitting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="hireDate">Hire Date</Label>
                <Input id="hireDate" name="hireDate" type="date" value={form.hireDate} onChange={handleChange} disabled={submitting} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isDriver"
                name="isDriver"
                type="checkbox"
                checked={form.isDriver}
                onChange={handleChange}
                disabled={submitting}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="isDriver" className="cursor-pointer">This employee is a driver</Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Employee
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/employees">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
