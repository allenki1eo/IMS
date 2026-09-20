"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { HeroSpendTile, RiskTiles } from "@/components/reports/HomeTiles";
import { useCurrency } from "@/hooks/useCurrency";
import type { DirectorHome } from "@/modules/reports/home.service";

export default function DirectorHomePage() {
  const currency = useCurrency();
  const [data, setData] = useState<DirectorHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/home?view=director");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setData(null);
        const msg = json.message || "Failed to load director home";
        setError(msg);
        toast.error(msg);
        return;
      }
      setData(json.data as DirectorHome);
    } catch {
      setData(null);
      setError("Failed to load director home");
      toast.error("Failed to load director home");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, retry]);

  if (loading) return <LoadingState text="Loading director home…" />;
  if (error || !data) {
    return (
      <ErrorState
        title="Could not load director home"
        description="Spend today and risk tiles were not loaded. This is not the same as zeros."
        error={error}
        onRetry={() => setRetry((c) => c + 1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Director home"
        description={`What needs attention today (EAT ${data.calendarDate}). Spend matches EOD SMS.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/analytics/operations">
              <Button variant="outline">Ops home</Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline">Reports</Button>
            </Link>
          </div>
        }
      />

      <HeroSpendTile tile={data.hero} currency={currency} />
      <RiskTiles tiles={data.tiles} currency={currency} />
    </div>
  );
}
