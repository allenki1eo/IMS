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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  branch?: { id: string; name: string } | null;
  parent?: { id: string; name: string } | null;
}

interface Branch { id: string; name: string; }
interface DeptOption { id: string; name: string; }

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [dept, setDept] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [allDepts, setAllDepts] = useState<DeptOption[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    branchId: "",
    parentId: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/departments/${id}`).then((r) => r.json()),
      fetch("/api/branches?pageSize=200").then((r) => r.json()),
      fetch("/api/departments?pageSize=200").then((r) => r.json()),
    ])
      .then(([deptJson, branchJson, deptsJson]) => {
        const d = deptJson.data;
        setDept(d);
        if (d) {
          setForm({
            name: d.name,
            description: d.description ?? "",
            branchId: d.branch?.id ?? "",
            parentId: d.parent?.id ?? "",
          });
        }
        setBranches(branchJson.data ?? []);
        setAllDepts((deptsJson.data ?? []).filter((dep: DeptOption) => dep.id !== id));
      })
      .catch(() => toast.error("Failed to load department"))
      .finally(() => setLoading(false));
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSelect(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value === "__none" ? "" : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          branchId: form.branchId || undefined,
          parentId: form.parentId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update department"); return; }
      setDept((d) => d ? { ...d, name: form.name, description: form.description || null } : d);
      toast.success("Department updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!dept) return;
    const newStatus = dept.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setTogglingStatus(true);
    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update status"); return; }
      setDept((d) => d ? { ...d, status: newStatus } : d);
      toast.success(`Department ${newStatus === "ACTIVE" ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Network error");
    } finally {
      setTogglingStatus(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!dept) return <div className="text-muted-foreground">Department not found.</div>;

  return (
    <div>
      <PageHeader
        title={dept.name}
        description={`Code: ${dept.code}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/company/departments">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <PermissionGuard require="company:department:update">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Department Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input id="name" name="name" value={form.name} onChange={handleChange} disabled={saving} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="code">Code</Label>
                  <Input id="code" value={dept.code} disabled readOnly className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label>Branch</Label>
                  <Select value={form.branchId || "__none"} onValueChange={(v) => handleSelect("branchId", v)} disabled={saving}>
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
                  <Label>Parent Department</Label>
                  <Select value={form.parentId || "__none"} onValueChange={(v) => handleSelect("parentId", v)} disabled={saving}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {allDepts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" value={form.description} onChange={handleChange} disabled={saving} />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving && <LoadingSpinner className="mr-2" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </PermissionGuard>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusBadge status={dept.status} />
              <PermissionGuard require="company:department:update">
                <Button
                  variant={dept.status === "ACTIVE" ? "destructive" : "default"}
                  size="sm"
                  className="w-full"
                  onClick={toggleStatus}
                  disabled={togglingStatus}
                >
                  {togglingStatus && <LoadingSpinner className="mr-2" />}
                  {dept.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </Button>
              </PermissionGuard>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
