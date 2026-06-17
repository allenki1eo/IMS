"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const VESSEL_LABELS: Record<string, string> = {
  WORT_COOLER: "Wort Cooler", TRANSFER_LINE: "Transfer Line", LAUTER_TUN: "Lauter Tun",
  MASH_TUN: "Mash Tun", HOLDING_TANK: "Holding Tank", WORT_KETTLE: "Wort Kettle",
  WHIRLPOOL: "Whirlpool", FERMENTER: "Fermenter / Unitank", BBT: "Bright Beer Tank (BBT)",
  YEAST_PITCHING_LINE: "Yeast Pitching Line", HOSE_PIPE: "Hose Pipe",
};

interface CIPRecord {
  id: string;
  vessel: string;
  cipDate: string;
  startTime?: string | null;
  endTime?: string | null;
  causticTemp?: number | null;
  causticHL?: number | null;
  causticTimeMin?: number | null;
  causticCondition?: string | null;
  pushWaterHL?: number | null;
  nitricAcidPct?: number | null;
  nitricHL?: number | null;
  nitricTimeMin?: number | null;
  rinsingWaterHL?: number | null;
  rinsingTimeMin?: number | null;
  carryOver?: string | null;
  operatorSign?: string | null;
  notes?: string | null;
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5 pr-4 text-muted-foreground text-sm w-48">{label}</td>
      <td className="py-1.5 font-medium text-sm">{value ?? "—"}</td>
    </tr>
  );
}

export default function CIPRecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [record, setRecord] = useState<CIPRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/brewing/cip/${id}`)
      .then((r) => r.json())
      .then((d) => { setRecord(d.data); setLoading(false); });
  }, [id]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!record) return <div className="p-8 text-red-500">Record not found</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={`CIP Record — ${VESSEL_LABELS[record.vessel] ?? record.vessel}`}
        description={format(new Date(record.cipDate), "dd MMM yyyy")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" asChild>
              <Link href="/production/brewing/cip">Back to List</Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Overview</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full">
            <tbody>
              <Row label="Vessel" value={VESSEL_LABELS[record.vessel] ?? record.vessel} />
              <Row label="CIP Date" value={format(new Date(record.cipDate), "dd MMM yyyy")} />
              <Row label="Start Time" value={record.startTime} />
              <Row label="End Time" value={record.endTime} />
              <Row label="Operator / Signature" value={record.operatorSign} />
              <Row label="Carry Over" value={record.carryOver} />
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Caustic Wash</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full">
            <tbody>
              <Row label="Temperature (°C)" value={record.causticTemp} />
              <Row label="Volume (HL)" value={record.causticHL} />
              <Row label="Time (min)" value={record.causticTimeMin} />
              <Row label="Condition" value={record.causticCondition} />
              <Row label="Push Water (HL)" value={record.pushWaterHL} />
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Nitric Acid Rinse</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full">
            <tbody>
              <Row label="Concentration (%)" value={record.nitricAcidPct} />
              <Row label="Volume (HL)" value={record.nitricHL} />
              <Row label="Time (min)" value={record.nitricTimeMin} />
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Final Rinsing</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full">
            <tbody>
              <Row label="Water Volume (HL)" value={record.rinsingWaterHL} />
              <Row label="Time (min)" value={record.rinsingTimeMin} />
            </tbody>
          </table>
        </CardContent>
      </Card>

      {record.notes && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">{record.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
