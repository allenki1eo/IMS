"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SpecParam {
  id: string;
  paramName: string;
  unit?: string | null;
  target?: string | null;
  rangeMin?: string | null;
  rangeMax?: string | null;
  notes?: string | null;
  sortOrder: number;
}

interface ProductSpec {
  id: string;
  brand: string;
  productCode?: string | null;
  version: string;
  isActive: boolean;
  notes?: string | null;
  parameters: SpecParam[];
}

export default function ProductSpecDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [spec, setSpec] = useState<ProductSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetch(`/api/lab/specs/${id}`)
      .then((r) => r.json())
      .then((d) => { setSpec(d.data); setLoading(false); });
  }, [id]);

  async function toggleActive() {
    if (!spec) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/lab/specs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !spec.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();
      setSpec((prev) => prev ? { ...prev, isActive: data.data.isActive } : prev);
      toast.success(`Spec ${data.data.isActive ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Failed to update spec status");
    } finally {
      setToggling(false);
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!spec) return <div className="p-8 text-red-500">Spec not found</div>;

  const sorted = [...spec.parameters].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={`${spec.brand}${spec.productCode ? ` (${spec.productCode})` : ""} — v${spec.version}`}
        description="Packaged product quality specification sheet"
        actions={
          <div className="flex gap-2">
            <Button variant={spec.isActive ? "outline" : "default"} onClick={toggleActive} disabled={toggling}>
              {toggling ? "Updating..." : spec.isActive ? "Deactivate" : "Activate"}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" asChild>
              <Link href="/qc/lab/specs">Back to List</Link>
            </Button>
          </div>
        }
      />

      <div className="flex gap-6 text-sm items-center">
        <div><span className="text-muted-foreground">Brand:</span> <strong>{spec.brand}</strong></div>
        {spec.productCode && <div><span className="text-muted-foreground">Code:</span> <strong>{spec.productCode}</strong></div>}
        <div><span className="text-muted-foreground">Version:</span> <strong>v{spec.version}</strong></div>
        <div><StatusBadge status={spec.isActive ? "ACTIVE" : "INACTIVE"} /></div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Quality Parameters</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted text-left text-muted-foreground text-xs">
                <th className="border px-2 py-1 w-40">Parameter</th>
                <th className="border px-2 py-1 w-20">Unit</th>
                <th className="border px-2 py-1 w-32">Target</th>
                <th className="border px-2 py-1 w-24">Range Min</th>
                <th className="border px-2 py-1 w-24">Range Max</th>
                <th className="border px-2 py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="border px-2 py-1.5 font-medium">{p.paramName}</td>
                  <td className="border px-2 py-1.5 text-muted-foreground">{p.unit ?? ""}</td>
                  <td className="border px-2 py-1.5">{p.target ?? ""}</td>
                  <td className="border px-2 py-1.5">{p.rangeMin ?? ""}</td>
                  <td className="border px-2 py-1.5">{p.rangeMax ?? ""}</td>
                  <td className="border px-2 py-1.5 text-muted-foreground text-xs">{p.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {spec.notes && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">{spec.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
