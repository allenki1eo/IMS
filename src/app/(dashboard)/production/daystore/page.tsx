"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Package, Calendar, ClipboardList, AlertTriangle, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
function qty(n: number, uom: string) {
  return `${n.toLocaleString()} ${uom}`.trim();
}

interface DaystoreBatch {
  id: string;
  reference: string;
  productName: string;
  plannedQty: number;
  uom: string;
  status: string;
  lineName: string | null;
}

interface DaystoreMaterial {
  itemId: string | null;
  itemCode: string | null;
  description: string;
  uom: string;
  requiredQty: number;
  totalStock: number;
  daystoreStock: number;
  shortfall: number;
  status: "OK" | "SHORTAGE" | "UNKNOWN";
}

interface DaystorePlan {
  date: string;
  batches: DaystoreBatch[];
  materials: DaystoreMaterial[];
}

function formatDateInput(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function DaystorePage() {
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [plan, setPlan] = useState<DaystorePlan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/production/daystore?date=${date}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to load daystore plan");
        return;
      }
      setPlan(json.data ?? json);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  if (loading) return <LoadingState />;

  const shortageCount = plan?.materials.filter((m) => m.status === "SHORTAGE").length ?? 0;
  const unknownCount = plan?.materials.filter((m) => m.status === "UNKNOWN").length ?? 0;

  return (
    <div>
      <PageHeader
        title="Production Daystore"
        description="Daily material requirements and daystore stock levels"
      />

      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        </div>
        {shortageCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {shortageCount} shortage{shortageCount > 1 ? "s" : ""}
          </Badge>
        )}
        {unknownCount > 0 && (
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {unknownCount} unmapped
          </Badge>
        )}
        {shortageCount === 0 && unknownCount === 0 && plan && plan.materials.length > 0 && (
          <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-3 w-3" />
            All materials available
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Batches</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plan?.batches.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Materials Required</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plan?.materials.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Shortages</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${shortageCount > 0 ? "text-destructive" : ""}`}>
              {shortageCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batches scheduled */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Scheduled Batches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Line</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Planned Qty</th>
                </tr>
              </thead>
              <tbody>
                {(!plan || plan.batches.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No batches scheduled for this date
                    </td>
                  </tr>
                ) : (
                  plan.batches.map((batch) => (
                    <tr key={batch.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/production/batches/${batch.id}`} className="font-medium hover:underline">
                          {batch.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{batch.productName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{batch.lineName ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={batch.status} /></td>
                      <td className="px-4 py-3">{qty(batch.plannedQty, batch.uom)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Material requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Material Requirements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Material</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Required</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Daystore Stock</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total Stock</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Shortfall</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {(!plan || plan.materials.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No materials required for this date
                    </td>
                  </tr>
                ) : (
                  plan.materials.map((mat, idx) => (
                    <tr key={idx} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{mat.description}</td>
                      <td className="px-4 py-3">
                        {mat.itemCode ? (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{mat.itemCode}</code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{qty(mat.requiredQty, mat.uom)}</td>
                      <td className="px-4 py-3">{qty(mat.daystoreStock, mat.uom)}</td>
                      <td className="px-4 py-3">{qty(mat.totalStock, mat.uom)}</td>
                      <td className="px-4 py-3">
                        {mat.shortfall > 0 ? (
                          <span className="text-destructive font-medium">{qty(mat.shortfall, mat.uom)}</span>
                        ) : (
                          <span className="text-green-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {mat.status === "OK" && (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700 gap-1">
                            <CheckCircle className="h-3 w-3" /> OK
                          </Badge>
                        )}
                        {mat.status === "SHORTAGE" && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Shortage
                          </Badge>
                        )}
                        {mat.status === "UNKNOWN" && (
                          <Badge variant="secondary" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Unknown
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



