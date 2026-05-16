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

interface Branch {
  id: string;
  name: string;
  code: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isMain: boolean;
  status: string;
}

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    fetch(`/api/branches/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const b = d.data;
        setBranch(b);
        if (b) {
          setForm({
            name: b.name,
            city: b.city ?? "",
            address: b.address ?? "",
            phone: b.phone ?? "",
            email: b.email ?? "",
          });
        }
      })
      .catch(() => toast.error("Failed to load branch"))
      .finally(() => setLoading(false));
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/branches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          city: form.city || undefined,
          address: form.address || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update branch"); return; }
      setBranch((b) => b ? { ...b, ...json.data } : b);
      toast.success("Branch updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!branch) return;
    const newStatus = branch.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setTogglingStatus(true);
    try {
      const res = await fetch(`/api/branches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update status"); return; }
      setBranch((b) => b ? { ...b, status: newStatus } : b);
      toast.success(`Branch ${newStatus === "ACTIVE" ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Network error");
    } finally {
      setTogglingStatus(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!branch) return <div className="text-muted-foreground">Branch not found.</div>;

  return (
    <div>
      <PageHeader
        title={branch.name}
        description={`Code: ${branch.code}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/company/branches">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <PermissionGuard require="company:branch:update">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Branch Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <Label htmlFor="name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="name" name="name" value={form.name} onChange={handleChange} disabled={saving} />
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <Label htmlFor="code">Code</Label>
                    <Input id="code" value={branch.code} disabled readOnly className="bg-muted" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" value={form.address} onChange={handleChange} disabled={saving} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" value={form.city} onChange={handleChange} disabled={saving} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} disabled={saving} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} disabled={saving} />
                  </div>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={branch.status} />
                {branch.isMain && <Badge variant="default">Main Branch</Badge>}
              </div>
              <PermissionGuard require="company:branch:update">
                <Button
                  variant={branch.status === "ACTIVE" ? "destructive" : "default"}
                  size="sm"
                  className="w-full"
                  onClick={toggleStatus}
                  disabled={togglingStatus}
                >
                  {togglingStatus && <LoadingSpinner className="mr-2" />}
                  {branch.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </Button>
              </PermissionGuard>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
