"use client";

import { use } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Activity {
  id: string;
  section: string;
  activity: string;
  unit?: string | null;
  target?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  actual?: string | null;
  reasonOutSpec?: string | null;
  sortOrder: number;
}

interface Session {
  id: string;
  reference: string;
  brewDate: string;
  brand: string;
  brewNumber?: string | null;
  status: string;
  notes?: string | null;
  batch?: { id: string; reference: string; productName: string } | null;
  activities: Activity[];
}

const SECTION_LABELS: Record<string, string> = {
  MASH_CONVERSION: "Mash Conversion",
  LAUTERING: "Lautering",
  WORT_BOILING: "Wort Boiling",
  COOLING_AERATION: "Cooling & Aeration",
  PITCHING: "Yeast Pitching",
};

export default function BrewingSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetch(`/api/brewing/sessions/${id}`)
      .then((r) => r.json())
      .then((d) => { setSession(d.data); setLoading(false); });
  }, [id]);

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/brewing/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!res.ok) throw new Error("Failed to complete session");
      toast.success("Session marked as completed");
      router.refresh();
      setSession((prev) => prev ? { ...prev, status: "COMPLETED" } : prev);
    } catch {
      toast.error("Failed to complete session");
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!session) return <div className="p-8 text-red-500">Session not found</div>;

  const sectionKeys = [...new Set(session.activities.map((a) => a.section))];

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={`Brewing Session — ${session.reference}`}
        description={`${session.brand}${session.brewNumber ? ` • Brew #${session.brewNumber}` : ""}`}
        
        actions={
          <div className="flex gap-2">
            {session.status === "IN_PROGRESS" && (
              <Button variant="default" onClick={handleComplete} disabled={completing}>
                <CheckCircle className="mr-2 h-4 w-4" /> {completing ? "Completing..." : "Complete Session"}
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><span className="text-muted-foreground">Date:</span> <strong>{format(new Date(session.brewDate), "dd MMM yyyy")}</strong></div>
        <div><span className="text-muted-foreground">Brand:</span> <strong>{session.brand}</strong></div>
        {session.brewNumber && <div><span className="text-muted-foreground">Brew #:</span> <strong>{session.brewNumber}</strong></div>}
        <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={session.status} /></div>
        {session.batch && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Batch:</span>{" "}
            <Link href={`/production/batches/${session.batch.id}`} className="font-medium hover:underline">
              {session.batch.reference} — {session.batch.productName}
            </Link>
          </div>
        )}
      </div>

      {sectionKeys.map((sectionKey) => {
        const rows = session.activities
          .filter((a) => a.section === sectionKey)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <Card key={sectionKey}>
            <CardHeader>
              <CardTitle className="text-base">{SECTION_LABELS[sectionKey] ?? sectionKey}</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted text-left text-muted-foreground text-xs">
                    <th className="border px-2 py-1 w-44">Activity / Parameter</th>
                    <th className="border px-2 py-1 w-16">Unit</th>
                    <th className="border px-2 py-1 w-24">Target</th>
                    <th className="border px-2 py-1 w-24">Start Time</th>
                    <th className="border px-2 py-1 w-24">End Time</th>
                    <th className="border px-2 py-1 w-24">Actual</th>
                    <th className="border px-2 py-1">Reason Out of Spec</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="border px-2 py-1 font-medium">{a.activity}</td>
                      <td className="border px-2 py-1 text-muted-foreground">{a.unit ?? ""}</td>
                      <td className="border px-2 py-1 text-muted-foreground">{a.target ?? ""}</td>
                      <td className="border px-2 py-1 text-muted-foreground">{a.startTime ?? ""}</td>
                      <td className="border px-2 py-1 text-muted-foreground">{a.endTime ?? ""}</td>
                      <td className="border px-2 py-1 font-semibold">{a.actual ?? ""}</td>
                      <td className="border px-2 py-1 text-red-600 text-xs">{a.reasonOutSpec ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}

      {session.notes && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">{session.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
