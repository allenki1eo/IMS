"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PlantAssetRow {
  id: string;
  code: string;
  name: string;
  category: string;
  location?: string | null;
  status: string;
}

export default function PlantAssetsPage() {
  const [assets, setAssets] = useState<PlantAssetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/maintenance/plant-assets?pageSize=200")
      .then((r) => r.json())
      .then((json) => setAssets(Array.isArray(json.data) ? json.data : []))
      .catch(() => toast.error("Failed to load plant assets"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Plant Assets"
        description="Stills, tanks, fillers, boilers and other plant equipment"
        actions={
          <PermissionGuard require="maintenance:workorder:create">
            <Button asChild>
              <Link href="/maintenance/work-orders/new">
                <Plus className="h-4 w-4 mr-2" />
                New Work Order
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No plant assets yet. Run db seed or create via API.
                    </td>
                  </tr>
                ) : (
                  assets.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{a.code}</td>
                      <td className="px-4 py-3">{a.name}</td>
                      <td className="px-4 py-3">{a.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.location ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
