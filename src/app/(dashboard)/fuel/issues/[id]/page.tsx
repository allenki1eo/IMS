"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface FuelIssue {
  id: string;
  reference: string;
  quantityLiters: number;
  pricePerLiter: number | null;
  totalCost: number | null;
  odometerReading: number | null;
  issuedAt: string;
  notes: string | null;
  createdAt: string;
  tank: { id: string; name: string; code: string; fuelType: string };
  vehicle: { id: string; plateNumber: string; make: string | null; model: string | null; usageType?: string; nextRefuelAt?: string | null };
  driver: { id: string; employee: { fullName: string } } | null;
}

export default function FuelIssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<FuelIssue | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIssue = useCallback(async () => {
    try {
      const res = await fetch(`/api/fuel-issues/${id}`);
      if (!res.ok) throw new Error();
      setIssue(await res.json());
    } catch { toast.error("Failed to load fuel issue"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchIssue(); }, [fetchIssue]);

  if (loading) return <LoadingState />;
  if (!issue) return <div className="p-8 text-center text-muted-foreground">Fuel issue not found.</div>;

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/fuel/issues"><ArrowLeft className="h-4 w-4 mr-1" />Back to Issues</Link>
        </Button>
      </div>

      <PageHeader
        title={issue.reference}
        description={`Issued ${format(new Date(issue.issuedAt), "dd MMM yyyy HH:mm")}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Issue Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <code className="font-mono">{issue.reference}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tank</span>
              <span>{issue.tank.name} <Badge variant="outline" className="ml-1 text-xs">{issue.tank.fuelType}</Badge></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-semibold">{issue.quantityLiters.toLocaleString()} L</span>
            </div>
            {issue.pricePerLiter != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price / L</span>
                <span>${issue.pricePerLiter.toFixed(3)}</span>
              </div>
            )}
            {issue.totalCost != null && (
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Total Cost</span>
                <span className="font-semibold text-lg">
                  ${issue.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Vehicle & Driver</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle</span>
              <Link href={`/transport/vehicles/${issue.vehicle.id}`} className="hover:underline font-medium">
                {issue.vehicle.plateNumber}
                {issue.vehicle.make && ` — ${issue.vehicle.make}${issue.vehicle.model ? ` ${issue.vehicle.model}` : ""}`}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Driver</span>
              <span>{issue.driver ? issue.driver.employee.fullName : "—"}</span>
            </div>
            {issue.odometerReading != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Odometer</span>
                <span>{issue.odometerReading.toLocaleString()} km</span>
              </div>
            )}
            {issue.vehicle.usageType === "PRIVATE" && issue.vehicle.nextRefuelAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Refuel</span>
                <span className="text-amber-600 font-medium">{format(new Date(issue.vehicle.nextRefuelAt), "dd MMM yyyy")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issued At</span>
              <span>{format(new Date(issue.issuedAt), "dd MMM yyyy HH:mm")}</span>
            </div>
            {issue.notes && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground block mb-1">Notes</span>
                <p className="text-sm">{issue.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
