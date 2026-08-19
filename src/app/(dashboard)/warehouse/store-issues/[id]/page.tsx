"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const TYPE_LABELS: Record<string, string> = {
  ISSUE_TO_PRODUCTION: "Issue to Production",
  RETURN_FROM_PRODUCTION: "Return from Production",
  RETURN_TO_SUPPLIER: "Return to Supplier",
  OTHER_ADDITION: "Other Addition",
  OTHER_DEDUCTION: "Other Deduction",
};

interface IssueLine {
  id: string;
  quantity: number;
  notes?: string | null;
  item: { id: string; name: string; code: string; uom?: { symbol: string } | null };
}

interface StoreIssue {
  id: string;
  reference: string;
  issueType: string;
  issueDate: string;
  destination?: string | null;
  notes?: string | null;
  warehouse: { name: string; code: string };
  lines: IssueLine[];
}

export default function StoreIssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [issue, setIssue] = useState<StoreIssue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/warehouse/store-issues/${id}`)
      .then((r) => r.json())
      .then((d) => setIssue(d.data ?? null))
      .catch(() => toast.error("Failed to load store issue"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!issue) return <div className="p-8 text-red-500">Store issue not found</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={`${TYPE_LABELS[issue.issueType] ?? issue.issueType} — ${issue.reference}`}
        description={`${issue.warehouse.name} • ${format(new Date(issue.issueDate), "dd MMM yyyy")}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" asChild>
              <Link href="/warehouse/store-issues">Back to List</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><span className="text-muted-foreground">Reference:</span> <strong>{issue.reference}</strong></div>
        <div><span className="text-muted-foreground">Type:</span> <strong>{TYPE_LABELS[issue.issueType] ?? issue.issueType}</strong></div>
        <div><span className="text-muted-foreground">Warehouse:</span> <strong>{issue.warehouse.name}</strong></div>
        {issue.destination && (
          <div><span className="text-muted-foreground">Destination:</span> <strong>{issue.destination}</strong></div>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted text-left text-muted-foreground text-xs">
                <th className="border px-2 py-1">Item</th>
                <th className="border px-2 py-1 w-24">Code</th>
                <th className="border px-2 py-1 w-28 text-right">Quantity</th>
                <th className="border px-2 py-1 w-16">UoM</th>
                <th className="border px-2 py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {issue.lines.map((line) => (
                <tr key={line.id} className="border-b last:border-0">
                  <td className="border px-2 py-1 font-medium">{line.item.name}</td>
                  <td className="border px-2 py-1 text-muted-foreground">{line.item.code}</td>
                  <td className="border px-2 py-1 text-right font-semibold">{line.quantity.toLocaleString()}</td>
                  <td className="border px-2 py-1 text-muted-foreground">{line.item.uom?.symbol ?? ""}</td>
                  <td className="border px-2 py-1 text-muted-foreground text-xs">{line.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {issue.notes && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">{issue.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
