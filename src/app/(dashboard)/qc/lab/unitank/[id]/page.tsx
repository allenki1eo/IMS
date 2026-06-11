"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const STAGE_LABELS: Record<string, string> = {
  PITCHING: "Pitching", PRIMARY: "Primary Fermentation", SECONDARY: "Secondary / Conditioning",
  MATURATION: "Maturation", LAGERING: "Lagering", TRANSFER_TO_BBT: "Transfer to BBT", FINAL: "Final Check",
};

interface UTAnalysis {
  id: string;
  tankNumber: string;
  brand: string;
  stage: string;
  sampleDate: string;
  sampleTime?: string | null;
  alc?: number | null;
  oe?: number | null;
  pg?: number | null;
  ph?: number | null;
  fg?: number | null;
  col?: number | null;
  bu?: number | null;
  adf?: number | null;
  notes?: string | null;
  batch?: { id: string; reference: string; productName: string } | null;
}

function Row({ label, value, unit }: { label: string; value?: number | string | null; unit?: string }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5 pr-4 text-muted-foreground text-sm w-48">{label}</td>
      <td className="py-1.5 font-medium text-sm">{value != null ? `${value}${unit ? ` ${unit}` : ""}` : "—"}</td>
    </tr>
  );
}

export default function UnitankAnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [analysis, setAnalysis] = useState<UTAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/lab/unitank/${id}`)
      .then((r) => r.json())
      .then((d) => { setAnalysis(d.data); setLoading(false); });
  }, [id]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!analysis) return <div className="p-8 text-red-500">Analysis not found</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={`UT${analysis.tankNumber} — ${analysis.brand}`}
        description={`${STAGE_LABELS[analysis.stage] ?? analysis.stage} • ${format(new Date(analysis.sampleDate), "dd MMM yyyy")}${analysis.sampleTime ? ` @ ${analysis.sampleTime}` : ""}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" asChild>
              <Link href="/qc/lab/unitank">Back to List</Link>
            </Button>
          </div>
        }
      />

      {analysis.batch && (
        <div className="text-sm">
          <span className="text-muted-foreground">Production Batch: </span>
          <Link href={`/production/batches/${analysis.batch.id}`} className="font-medium hover:underline">
            {analysis.batch.reference} — {analysis.batch.productName}
          </Link>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Analysis Results</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full">
            <tbody>
              <Row label="Tank Number" value={`UT${analysis.tankNumber}`} />
              <Row label="Brand" value={analysis.brand} />
              <Row label="Stage" value={STAGE_LABELS[analysis.stage] ?? analysis.stage} />
              <Row label="Sample Date" value={format(new Date(analysis.sampleDate), "dd MMM yyyy")} />
              <Row label="Sample Time" value={analysis.sampleTime} />
              <Row label="ALC (% v/v)" value={analysis.alc?.toFixed(2)} />
              <Row label="Original Extract (O.E.)" value={analysis.oe?.toFixed(2)} unit="°P" />
              <Row label="Present Gravity (P.G.)" value={analysis.pg?.toFixed(3)} />
              <Row label="Final Gravity (F.G.)" value={analysis.fg?.toFixed(3)} />
              <Row label="pH" value={analysis.ph?.toFixed(2)} />
              <Row label="Colour" value={analysis.col?.toFixed(1)} unit="EBC" />
              <Row label="Bitterness (BU)" value={analysis.bu?.toFixed(1)} unit="IBU" />
              <Row label="ADF (%)" value={analysis.adf?.toFixed(1)} />
            </tbody>
          </table>
        </CardContent>
      </Card>

      {analysis.notes && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">{analysis.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
