"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  employmentType: string;
  hireDate: string | null;
  status: string;
  isDriver: boolean;
  branch?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  user?: { id: string; fullName: string; username: string } | null;
}

interface Branch { id: string; name: string; }
interface Department { id: string; name: string; }

const EMPLOYMENT_TYPES = ["PERMANENT", "CONTRACT", "CASUAL", "TEMPORARY"];
const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "TERMINATED", label: "Terminated" },
];

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [form, setForm] = useState({
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
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/employees/${id}`).then((r) => r.json()),
      fetch("/api/branches?pageSize=200").then((r) => r.json()),
      fetch("/api/departments?pageSize=200").then((r) => r.json()),
    ])
      .then(([empJson, branchJson, deptJson]) => {
        const e = empJson.data;
        setEmployee(e);
        if (e) {
          setForm({
            firstName: e.firstName,
            lastName: e.lastName,
            email: e.email ?? "",
            phone: e.phone ?? "",
            position: e.position ?? "",
            branchId: e.branch?.id ?? "",
            departmentId: e.department?.id ?? "",
            employmentType: e.employmentType,
            hireDate: e.hireDate ? e.hireDate.split("T")[0] : "",
            isDriver: e.isDriver,
          });
          setNewStatus(e.status);
        }
        setBranches(branchJson.data ?? []);
        setDepartments(deptJson.data ?? []);
      })
      .catch(() => toast.error("Failed to load employee"))
      .finally(() => setLoading(false));
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handleSelect(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value === "__none" ? "" : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName) { toast.error("First and last name are required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      if (!res.ok) { toast.error(json.error ?? "Failed to update employee"); return; }
      toast.success("Employee updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function applyStatusChange() {
    if (!newStatus || newStatus === employee?.status) return;
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update status"); return; }
      setEmployee((e) => e ? { ...e, status: newStatus } : e);
      toast.success("Status updated");
    } catch {
      toast.error("Network error");
    } finally {
      setChangingStatus(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!employee) return <div className="text-muted-foreground">Employee not found.</div>;

  return (
    <div>
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        description={employee.employeeNumber}
        actions={
          <Button variant="outline" asChild>
            <Link href="/employees">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <PermissionGuard require="employees:employee:update">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Employee Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                    <Input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} disabled={saving} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                    <Input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} disabled={saving} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} disabled={saving} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} disabled={saving} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="position">Position</Label>
                  <Input id="position" name="position" value={form.position} onChange={handleChange} disabled={saving} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Branch</Label>
                    <Select value={form.branchId || "__none"} onValueChange={(v) => handleSelect("branchId", v)} disabled={saving}>
                      <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Department</Label>
                    <Select value={form.departmentId || "__none"} onValueChange={(v) => handleSelect("departmentId", v)} disabled={saving}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Employment Type</Label>
                    <Select value={form.employmentType} onValueChange={(v) => handleSelect("employmentType", v)} disabled={saving}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="hireDate">Hire Date</Label>
                    <Input id="hireDate" name="hireDate" type="date" value={form.hireDate} onChange={handleChange} disabled={saving} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="isDriver"
                    name="isDriver"
                    type="checkbox"
                    checked={form.isDriver}
                    onChange={handleChange}
                    disabled={saving}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <Label htmlFor="isDriver" className="cursor-pointer">This employee is a driver</Label>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving && <LoadingSpinner className="mr-2" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </PermissionGuard>

        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={employee.status} />
                {employee.isDriver && <Badge variant="secondary">Driver</Badge>}
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">Hired: {formatDate(employee.hireDate)}</p>
              <PermissionGuard require="employees:employee:update">
                <div className="space-y-2">
                  <Label>Change Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="w-full" onClick={applyStatusChange} disabled={changingStatus || newStatus === employee.status}>
                    {changingStatus && <LoadingSpinner className="mr-2" />}
                    Apply
                  </Button>
                </div>
              </PermissionGuard>
            </CardContent>
          </Card>

          {/* Linked User Account */}
          {employee.user && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked Account</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{employee.user.fullName}</p>
                <p className="text-muted-foreground">@{employee.user.username}</p>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link href={`/admin/users/${employee.user.id}`}>View User</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
