"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const SECTION_LABELS: Record<string, string> = {
  MASH_TUN: "Mash Tun",
  WORT_KETTLE: "Wort Kettle",
};

interface MaterialItem {
  id: string;
  section: string;
  itemName: string;
  uom?: string | null;
  targetQty?: number | null;
  actualQty?: number | null;
  additionalQty?: number | null;
  recommendedQty?: number | null;
  notes?: string | null;
  sortOrder: number;
}

interface MaterialUsage {
  id: string;
  reference: string;
  brewDate: string;
  brand: string;
  notes?: string | null;
  batch?: { id: string; reference: string; productName: string } | null;
  items: MaterialItem[];
}

export default function MaterialUsageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [usage, setUsage] = useState<MaterialUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/brewing/material-usage/${id}`)
      .then((r) => r.json())
      .then((d) => { setUsage(d.data); setLoading(false); });
  }, [id]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!usage) return <div className="p-8 text-red-500">Record not found</div>;

  const sections = [...new Set(usage.items.map((i) => i.section))];

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={`Material Usage — ${usage.reference}`}
        description={`${usage.brand} • ${format(new Date(usage.brewDate), "dd MMM yyyy")}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" asChild>
              <Link href="/production/brewing/material-usage">Back to List</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><span className="text-muted-foreground">Reference:</span> <strong>{usage.reference}</strong></div>
        <div><span className="text-muted-foreground">Date:</span> <strong>{format(new Date(usage.brewDate), "dd MMM yyyy")}</strong></div>
        <div><span className="text-muted-foreground">Brand:</span> <strong>{usage.brand}</strong></div>
        {usage.batch && (
          <div>
            <span className="text-muted-foreground">Batch: </span>
            <Link href={`/production/batches/${usage.batch.id}`} className="font-medium hover:underline">
              {usage.batch.reference}
            </Link>
          </div>
        )}
      </div>

      {sections.map((section) => {
        const rows = usage.items.filter((i) => i.section === section).sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <Card key={section}>
            <CardHeader><CardTitle className="text-base">{SECTION_LABELS[section] ?? section}</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted text-left text-muted-foreground text-xs">
                    <th className="border px-2 py-1">Item / Ingredient</th>
                    <th className="border px-2 py-1 w-16">UOM</th>
                    <th className="border px-2 py-1 w-24">Target</th>
                    <th className="border px-2 py-1 w-24">Actual</th>
                    <th className="border px-2 py-1 w-24">Additional</th>
                    <th className="border px-2 py-1 w-24">Recommended</th>
                    <th className="border px-2 py-1">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="border px-2 py-1 font-medium">{item.itemName}</td>
                      <td className="border px-2 py-1 text-muted-foreground">{item.uom ?? ""}</td>
                      <td className="border px-2 py-1">{item.targetQty ?? ""}</td>
                      <td className="border px-2 py-1 font-semibold">{item.actualQty ?? ""}</td>
                      <td className="border px-2 py-1">{item.additionalQty ?? ""}</td>
                      <td className="border px-2 py-1">{item.recommendedQty ?? ""}</td>
                      <td className="border px-2 py-1 text-muted-foreground text-xs">{item.notes ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}

      {usage.notes && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">{usage.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
