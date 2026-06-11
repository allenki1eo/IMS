"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const SAMPLE_TYPE_LABELS: Record<string, string> = {
  UNITANK: "Unitank", BBT: "BBT", BRIGHT_BEER: "Bright Beer", WORT: "Wort",
  PACKAGING: "Packaging", YEAST: "Yeast", WATER: "Water", FINISHED_GOODS: "Finished Goods",
};

interface Sample {
  id: string;
  sampleType: string;
  sampleSource?: string | null;
  brand?: string | null;
  desiredDetection?: string | null;
  incubation?: string | null;
  media?: string | null;
  result?: string | null;
  isInSpec?: boolean | null;
  actual?: string | null;
  remarks?: string | null;
  sortOrder: number;
}

interface MicroReport {
  id: string;
  reference: string;
  reportDate: string;
  notes?: string | null;
  samples: Sample[];
}

export default function MicroReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<MicroReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/lab/micro/${id}`)
      .then((r) => r.json())
      .then((d) => { setReport(d.data); setLoading(false); });
  }, [id]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!report) return <div className="p-8 text-red-500">Report not found</div>;

  const sorted = [...report.samples].sort((a, b) => a.sortOrder - b.sortOrder);
  const oos = sorted.filter((s) => s.isInSpec === false).length;

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title={`Micro Report — ${report.reference}`}
        description={format(new Date(report.reportDate), "dd MMM yyyy")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" asChild>
              <Link href="/qc/lab/micro">Back to List</Link>
            </Button>
          </div>
        }
      />

      <div className="flex gap-6 text-sm">
        <div><span className="text-muted-foreground">Total Samples:</span> <strong>{sorted.length}</strong></div>
        <div>
          <span className="text-muted-foreground">Out of Spec:</span>{" "}
          {oos > 0
            ? <span className="font-semibold text-red-600">{oos}</span>
            : <span className="font-semibold text-green-600">0 — All Pass</span>
          }
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Microbiology Samples</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-muted text-left text-muted-foreground text-xs">
                  <th className="border px-2 py-1">Sample Type</th>
                  <th className="border px-2 py-1">Source</th>
                  <th className="border px-2 py-1">Brand</th>
                  <th className="border px-2 py-1">Desired Detection</th>
                  <th className="border px-2 py-1">Incubation</th>
                  <th className="border px-2 py-1">Media</th>
                  <th className="border px-2 py-1">Result</th>
                  <th className="border px-2 py-1">In Spec?</th>
                  <th className="border px-2 py-1">Actual</th>
                  <th className="border px-2 py-1">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr key={s.id} className={`border-b last:border-0 ${s.isInSpec === false ? "bg-red-50" : ""}`}>
                    <td className="border px-2 py-1 font-medium">{SAMPLE_TYPE_LABELS[s.sampleType] ?? s.sampleType}</td>
                    <td className="border px-2 py-1">{s.sampleSource ?? "—"}</td>
                    <td className="border px-2 py-1">{s.brand ?? "—"}</td>
                    <td className="border px-2 py-1">{s.desiredDetection ?? "—"}</td>
                    <td className="border px-2 py-1">{s.incubation ?? "—"}</td>
                    <td className="border px-2 py-1">{s.media ?? "—"}</td>
                    <td className="border px-2 py-1">{s.result ?? "—"}</td>
                    <td className="border px-2 py-1">
                      {s.isInSpec === true && <span className="text-green-600 font-semibold">✓ Yes</span>}
                      {s.isInSpec === false && <span className="text-red-600 font-semibold">✗ No</span>}
                      {s.isInSpec == null && "—"}
                    </td>
                    <td className="border px-2 py-1">{s.actual ?? "—"}</td>
                    <td className="border px-2 py-1 text-xs text-muted-foreground">{s.remarks ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {report.notes && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">{report.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
