"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface RoleDetail {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
}

interface Permission {
  id: string;
  module: string;
  resource: string;
  action: string;
  description: string | null;
}

type PermissionMap = Record<string, Record<string, Permission[]>>;

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const canUpdate = usePermission("roles:role:update");
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [assignedPermIds, setAssignedPermIds] = useState<Set<string>>(new Set());
  const [permMap, setPermMap] = useState<PermissionMap>({});

  const buildPermMap = useCallback((perms: Permission[]): PermissionMap => {
    const map: PermissionMap = {};
    for (const p of perms) {
      if (!map[p.module]) map[p.module] = {};
      if (!map[p.module][p.resource]) map[p.module][p.resource] = [];
      map[p.module][p.resource].push(p);
    }
    return map;
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`/api/roles/${id}`).then((r) => r.json()),
      fetch("/api/permissions?pageSize=500").then((r) => r.json()),
      fetch(`/api/roles/${id}/permissions`).then((r) => r.json()),
    ])
      .then(([roleJson, permsJson, assignedJson]) => {
        const r = roleJson.data;
        setRole(r);
        setName(r?.name ?? "");
        setDescription(r?.description ?? "");

        const perms: Permission[] = permsJson.data ?? [];
        setAllPerms(perms);
        setPermMap(buildPermMap(perms));

        const assigned: Permission[] = assignedJson.data ?? [];
        setAssignedPermIds(new Set(assigned.map((p: Permission) => p.id)));
      })
      .catch(() => toast.error("Failed to load role data"))
      .finally(() => setLoading(false));
  }, [id, buildPermMap]);

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!name) { toast.error("Name is required"); return; }
    setSavingInfo(true);
    try {
      const res = await fetch(`/api/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update role"); return; }
      setRole((prev) => prev ? { ...prev, name, description: description || null } : prev);
      toast.success("Role updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSavingInfo(false);
    }
  }

  function togglePerm(permId: string) {
    setAssignedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }

  async function savePermissions() {
    setSavingPerms(true);
    try {
      const res = await fetch(`/api/roles/${id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: Array.from(assignedPermIds) }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to save permissions"); return; }
      toast.success("Permissions saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSavingPerms(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!role) return <div className="text-muted-foreground">Role not found.</div>;

  return (
    <div>
      <PageHeader
        title={role.name}
        description={`Code: ${role.code}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/roles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Basic Info */}
        <PermissionGuard require="roles:role:update">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveInfo} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={savingInfo}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="roleCode">Code</Label>
                  <Input id="roleCode" value={role.code} disabled readOnly className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Code cannot be changed after creation.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    disabled={savingInfo}
                  />
                </div>
                <Button type="submit" size="sm" disabled={savingInfo}>
                  {savingInfo && <LoadingSpinner className="mr-2" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </PermissionGuard>

        {/* Permissions Matrix */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Permissions</CardTitle>
            <PermissionGuard require="roles:role:update">
              <Button size="sm" onClick={savePermissions} disabled={savingPerms}>
                {savingPerms && <LoadingSpinner className="mr-2" />}
                Save Permissions
              </Button>
            </PermissionGuard>
          </CardHeader>
          <CardContent>
            {allPerms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No permissions defined.</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(permMap).map(([module, resources]) => (
                  <div key={module}>
                    <h3 className="text-sm font-semibold capitalize mb-3 text-foreground">
                      {module.replace(/_/g, " ")} Module
                    </h3>
                    <div className="space-y-3 pl-2">
                      {Object.entries(resources).map(([resource, perms]) => (
                        <div key={resource}>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                            {resource.replace(/_/g, " ")}
                          </p>
                          <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {perms.map((perm) => (
                              <label
                                key={perm.id}
                                className={`flex items-center gap-2 select-none ${canUpdate ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={assignedPermIds.has(perm.id)}
                                  onChange={() => togglePerm(perm.id)}
                                  disabled={!canUpdate}
                                  className="h-4 w-4 rounded border-input accent-primary"
                                />
                                <span className="text-sm capitalize">
                                  {perm.action.replace(/_/g, " ")}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
