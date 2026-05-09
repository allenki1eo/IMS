"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { qty } from "../../_components/production-ui";

interface Recipe {
  id: string;
  code: string;
  name: string;
  productName: string;
  productCode?: string | null;
  batchSize: number;
  uom: string;
  version: string;
  status: string;
  notes?: string | null;
  materials: Array<{ id: string; itemCode?: string | null; description: string; quantity: number; uom: string; wastagePct: number }>;
  batches: Array<{ id: string; reference: string; productName: string; plannedQty: number; uom: string; status: string; line?: { name: string } | null }>;
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadRecipe = useCallback(() => {
    setLoading(true);
    fetch(`/api/production/recipes/${id}`)
      .then((r) => r.json())
      .then((d) => setRecipe(d.data ?? null))
      .catch(() => toast.error("Failed to load recipe"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadRecipe(); }, [loadRecipe]);

  async function setStatus(status: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/production/recipes/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update recipe"); return; }
      setRecipe((prev) => prev ? { ...prev, status: json.data.status } : prev);
      toast.success(`Recipe marked ${status.toLowerCase()}`);
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!recipe) return <div className="text-muted-foreground">Recipe not found.</div>;

  return (
    <div>
      <PageHeader title={recipe.name} description={`${recipe.code} v${recipe.version}`} actions={<Button variant="outline" asChild><Link href="/production/recipes"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link></Button>} />
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Recipe Info</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><p className="text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={recipe.status} /></div></div>
            <div><p className="text-muted-foreground">Product</p><p className="mt-1">{recipe.productCode ? `${recipe.productCode} - ` : ""}{recipe.productName}</p></div>
            <div><p className="text-muted-foreground">Batch Size</p><p className="mt-1">{qty(recipe.batchSize, recipe.uom)}</p></div>
            <div><p className="text-muted-foreground">Version</p><p className="mt-1">{recipe.version}</p></div>
            {recipe.notes && <div className="sm:col-span-2"><p className="text-muted-foreground">Notes</p><p className="mt-1 whitespace-pre-wrap">{recipe.notes}</p></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <PermissionGuard require="production:batch:create"><Button className="w-full" asChild><Link href={`/production/batches/new?recipeId=${recipe.id}`}>Plan Batch</Link></Button></PermissionGuard>
            <PermissionGuard require="production:recipe:update">
              <Button className="w-full" variant="outline" onClick={() => setStatus(recipe.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")} disabled={actionLoading}>{actionLoading && <LoadingSpinner className="mr-2" />}Mark {recipe.status === "ACTIVE" ? "Inactive" : "Active"}</Button>
              <Button className="w-full" variant="outline" onClick={() => setStatus("ARCHIVED")} disabled={actionLoading || recipe.status === "ARCHIVED"}>Archive</Button>
            </PermissionGuard>
          </CardContent>
        </Card>
      </div>
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Materials</CardTitle></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Qty</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Wastage</th></tr></thead><tbody>{recipe.materials.map((line) => <tr key={line.id} className="border-t hover:bg-muted/30"><td className="px-4 py-3">{line.description}</td><td className="px-4 py-3">{line.itemCode ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{line.itemCode}</code> : "-"}</td><td className="px-4 py-3">{qty(line.quantity, line.uom)}</td><td className="px-4 py-3">{line.wastagePct}%</td></tr>)}</tbody></table></div></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Batches</CardTitle></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Line</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Qty</th></tr></thead><tbody>{recipe.batches.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No batches have used this recipe</td></tr> : recipe.batches.map((batch) => <tr key={batch.id} className="border-t hover:bg-muted/30"><td className="px-4 py-3"><Link href={`/production/batches/${batch.id}`} className="font-medium hover:underline">{batch.reference}</Link></td><td className="px-4 py-3 text-muted-foreground">{batch.line?.name ?? "-"}</td><td className="px-4 py-3"><StatusBadge status={batch.status} /></td><td className="px-4 py-3">{qty(batch.plannedQty, batch.uom)}</td></tr>)}</tbody></table></div></CardContent>
      </Card>
    </div>
  );
}

