"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Permission {
  id: string;
  module: string;
  resource: string;
  action: string;
  description: string | null;
}

type PermissionMap = Record<string, Permission[]>;

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/permissions?pageSize=500")
      .then((r) => r.json())
      .then((d) => setPermissions(d.data ?? []))
      .catch(() => toast.error("Failed to load permissions"))
      .finally(() => setLoading(false));
  }, []);

  const grouped = permissions.reduce<PermissionMap>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Permissions"
        description="Read-only view of all system permissions"
      />

      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([module, perms]) => (
            <Card key={module}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base capitalize">
                  {module.replace(/_/g, " ")} Module
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="pb-2 pr-4 font-medium text-muted-foreground">Resource</th>
                        <th className="pb-2 pr-4 font-medium text-muted-foreground">Action</th>
                        <th className="pb-2 font-medium text-muted-foreground">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perms.map((perm, idx) => (
                        <tr
                          key={perm.id}
                          className={idx < perms.length - 1 ? "border-b border-muted/50" : ""}
                        >
                          <td className="py-2 pr-4">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {perm.resource.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {perm.action}
                            </code>
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {perm.description ?? (
                              <span className="text-xs">
                                {perm.module}:{perm.resource}:{perm.action}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}

          {Object.keys(grouped).length === 0 && (
            <div className="text-center text-muted-foreground py-16">No permissions found.</div>
          )}
        </div>
      )}
    </div>
  );
}
