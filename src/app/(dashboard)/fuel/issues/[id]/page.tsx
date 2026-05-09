"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatLiters, formatMoney } from "../../_components/fuel-ui";

interface Issue {
  id: string;
  reference: string;
  quantityLiters: number;
  pricePerLiter: number | null;
  totalCost: number | null;
  odometerReading: number | null;
  issuedAt: string;
  notes: string | null;
  tank?: { id: string; name: string; code: string; fuelType: string; currentLevel: number; capacity: number } | null;
  vehicle?: { id: string; plateNumber: string; make: string; model: string; odometer: number } | null;
  driver?: { employee?: { fullName: string; employeeNumber: string; phone: string | null } | null } | null;
}

export default function FuelIssueDetailPage() {
  const params = useParams<{ id: string }>();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fuel-issues/${params.id}`);
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to load fuel issue"); return; }
      setIssue(json.data);
    } catch {
      toast.error("Failed to load fuel issue");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (!issue) return <div className="text-sm text-muted-foreground">Fuel issue not found.</div>;

  return (
    <div>
      <PageHeader
        title={issue.reference}
        description="Fuel issue details"
        actions={
          <Button variant="outline" asChild>
            <Link href="/fuel/issues">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Quantity</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatLiters(issue.quantityLiters)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Price / Liter</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatMoney(issue.pricePerLiter)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Total Cost</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatMoney(issue.totalCost)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Odometer</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{issue.odometerReading ?? "-"}</div></CardContent>
        </Card>
      </div>

      <Card className="max-w-3xl">
        <CardHeader><CardTitle className="text-base">Issue Information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Tank</span><div className="font-medium">{issue.tank?.name ?? "-"} {issue.tank ? `(${issue.tank.code})` : ""}</div></div>
          <div><span className="text-muted-foreground">Fuel Type</span><div className="font-medium">{issue.tank?.fuelType ?? "-"}</div></div>
          <div><span className="text-muted-foreground">Vehicle</span><div className="font-medium">{issue.vehicle ? `${issue.vehicle.plateNumber} - ${issue.vehicle.make} ${issue.vehicle.model}` : "-"}</div></div>
          <div><span className="text-muted-foreground">Driver</span><div className="font-medium">{issue.driver?.employee?.fullName ?? "-"}</div></div>
          <div><span className="text-muted-foreground">Issued At</span><div className="font-medium">{formatDate(issue.issuedAt)}</div></div>
          <div><span className="text-muted-foreground">Driver Phone</span><div className="font-medium">{issue.driver?.employee?.phone ?? "-"}</div></div>
          {issue.notes && <div className="sm:col-span-2"><span className="text-muted-foreground">Notes</span><div className="font-medium">{issue.notes}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}

