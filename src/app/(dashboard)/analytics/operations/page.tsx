"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskTiles } from "@/components/reports/HomeTiles";
import {
  LineFamilyFilter,
  type LineFamilyValue,
} from "@/components/reports/LineFamilyFilter";
import { useCurrency } from "@/hooks/useCurrency";
import type { OpsHome } from "@/modules/reports/home.service";

export default function OpsHomePage() {
  const currency = useCurrency();
  const [lineFamily, setLineFamily] = useState<LineFamilyValue>("ALL");
  const [data, setData] = useState<OpsHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/reports/home?view=ops&lineFamily=${encodeURIComponent(lineFamily)}`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setData(null);
        const msg = json.message || "Failed to load ops home";
        setError(msg);
        toast.error(msg);
        return;
      }
      setData(json.data as OpsHome);
    } catch {
      setData(null);
      setError("Failed to load ops home");
      toast.error("Failed to load ops home");
    } finally {
      setLoading(false);
    }
  }, [lineFamily]);

  useEffect(() => {
    load();
  }, [load, retry]);

  if (loading && !data) return <LoadingState text="Loading ops home…" />;
  if (error && !data) {
    return (
      <ErrorState
        title="Could not load ops home"
        description="Company spend and work queues were not loaded."
        error={error}
        onRetry={() => setRetry((c) => c + 1)}
      />
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ops home"
        description={`Company work for today (EAT ${data.calendarDate}).`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/analytics">
              <Button variant="outline">Director home</Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline">Reports</Button>
            </Link>
          </div>
        }
      />

      <LineFamilyFilter value={lineFamily} onChange={setLineFamily} />

      <RiskTiles tiles={data.tiles} currency={currency} />

      {data.shortageRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shortage detail</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Material
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Required
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Available
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.shortageRows.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2 font-medium">{row.description}</td>
                      <td className="px-4 py-2">
                        {row.requiredQty} {row.uom}
                      </td>
                      <td className="px-4 py-2">
                        {row.status === "NOT_LINKED" ? (
                          <span className="text-amber-700">{row.availableLabel}</span>
                        ) : (
                          <>
                            {row.availableQty} {row.uom}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {row.status === "NOT_LINKED" ? "Not linked" : "Shortage"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
