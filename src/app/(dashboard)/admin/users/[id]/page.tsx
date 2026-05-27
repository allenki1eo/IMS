"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, X } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getInitials, formatDateTime } from "@/lib/utils";

interface UserRole {
  id: string;
  name: string;
  code: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

interface UserDetail {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string | null;
  companyId: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  roles: UserRole[];
}

interface RoleOption {
  id: string;
  name: string;
  code: string;
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);

  // Assign role dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [allRoles, setAllRoles] = useState<RoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [removingRole, setRemovingRole] = useState<string | null>(null);

  // Reset password
  const [newPassword, setNewPassword] = useState("");
  const [resettingPw, setResettingPw] = useState(false);

  // Company assignment
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setUser(d.data);
        setSelectedCompanyId(d.data?.companyId ?? "");
      })
      .catch(() => toast.error("Failed to load user"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.data ?? []))
      .catch(() => {});
  }, []);

  async function toggleStatus() {
    if (!user) return;
    const activate = user.status !== "ACTIVE";
    const newStatus = activate ? "ACTIVE" : "INACTIVE";
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: activate }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update status"); return; }
      setUser((u) => u ? { ...u, status: newStatus } : u);
      toast.success(`User ${activate ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSavingStatus(false);
    }
  }

  async function openAssignDialog() {
    setAssignOpen(true);
    setSelectedRoleId("");
    try {
      const res = await fetch("/api/roles?pageSize=200");
      const json = await res.json();
      setAllRoles(json.data ?? []);
    } catch {
      toast.error("Failed to load roles");
    }
  }

  async function assignRole() {
    if (!selectedRoleId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/users/${id}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: selectedRoleId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to assign role"); return; }
      const assigned = allRoles.find((r) => r.id === selectedRoleId);
      if (assigned) {
        setUser((u) => u ? { ...u, roles: [...u.roles, assigned] } : u);
      }
      toast.success("Role assigned");
      setAssignOpen(false);
    } catch {
      toast.error("Network error");
    } finally {
      setAssigning(false);
    }
  }

  async function removeRole(roleId: string) {
    setRemovingRole(roleId);
    try {
      const res = await fetch(`/api/users/${id}/roles`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to remove role"); return; }
      setUser((u) => u ? { ...u, roles: u.roles.filter((r) => r.id !== roleId) } : u);
      toast.success("Role removed");
    } catch {
      toast.error("Network error");
    } finally {
      setRemovingRole(null);
    }
  }

  async function saveCompany() {
    setSavingCompany(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: selectedCompanyId || null }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update company"); return; }
      setUser((u) => u ? { ...u, companyId: selectedCompanyId || null } : u);
      toast.success("Company updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSavingCompany(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword) return;
    setResettingPw(true);
    try {
      const res = await fetch(`/api/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to reset password"); return; }
      toast.success("Password reset successfully");
      setNewPassword("");
    } catch {
      toast.error("Network error");
    } finally {
      setResettingPw(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!user) return <div className="text-muted-foreground">User not found.</div>;

  const assignedRoleIds = new Set(user.roles.map((r) => r.id));
  const availableRoles = allRoles.filter((r) => !assignedRoleIds.has(r.id));

  return (
    <div>
      <PageHeader
        title={user.fullName}
        description={`@${user.username}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4 mb-6">
              <Avatar className="h-16 w-16 text-lg">
                <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="font-semibold text-lg">{user.fullName}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
                {user.phone && <div className="text-sm text-muted-foreground">{user.phone}</div>}
                <StatusBadge status={user.status} />
              </div>
            </div>

            <Separator className="mb-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Username</span>
                <p className="font-medium">@{user.username}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Login</span>
                <p className="font-medium">{formatDateTime(user.lastLoginAt)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium">{formatDateTime(user.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          <PermissionGuard require="users:user:update">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Currently: <StatusBadge status={user.status} />
                </p>
                <Button
                  variant={user.status === "ACTIVE" ? "destructive" : "default"}
                  size="sm"
                  className="w-full"
                  onClick={toggleStatus}
                  disabled={savingStatus}
                >
                  {savingStatus && <LoadingSpinner className="mr-2" />}
                  {user.status === "ACTIVE" ? "Deactivate User" : "Activate User"}
                </Button>
              </CardContent>
            </Card>
          </PermissionGuard>

          {companies.length > 0 && (
            <PermissionGuard require="users:user:update">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Company Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select
                    value={selectedCompanyId || "__none"}
                    onValueChange={(v) => setSelectedCompanyId(v === "__none" ? "" : v)}
                    disabled={savingCompany}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No company assigned</SelectItem>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={saveCompany}
                    disabled={savingCompany || selectedCompanyId === (user.companyId ?? "")}
                  >
                    {savingCompany && <LoadingSpinner className="mr-2" />}
                    Save Company
                  </Button>
                </CardContent>
              </Card>
            </PermissionGuard>
          )}
        </div>
      </div>

      {/* Roles */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Assigned Roles</CardTitle>
          <PermissionGuard require="users:user:update">
            <Button size="sm" variant="outline" onClick={openAssignDialog}>
              Assign Role
            </Button>
          </PermissionGuard>
        </CardHeader>
        <CardContent>
          {user.roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm"
                >
                  <span>{role.name}</span>
                  <PermissionGuard require="users:user:update">
                    <button
                      className="ml-1 hover:text-destructive transition-colors"
                      onClick={() => removeRole(role.id)}
                      disabled={removingRole === role.id}
                      aria-label={`Remove ${role.name}`}
                    >
                      {removingRole === role.id ? (
                        <LoadingSpinner />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </PermissionGuard>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Password */}
      <PermissionGuard require="users:user:update">
        <Card className="mt-6 max-w-md">
          <CardHeader>
            <CardTitle className="text-base">Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={resetPassword} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  disabled={resettingPw}
                />
              </div>
              <Button type="submit" size="sm" disabled={resettingPw || !newPassword}>
                {resettingPw && <LoadingSpinner className="mr-2" />}
                Reset Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </PermissionGuard>

      {/* Assign Role Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-2 block">Select Role</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a role..." />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No available roles
                  </SelectItem>
                ) : (
                  availableRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={assignRole} disabled={!selectedRoleId || assigning}>
              {assigning && <LoadingSpinner className="mr-2" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
