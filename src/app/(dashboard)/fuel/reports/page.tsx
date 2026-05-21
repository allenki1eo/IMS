"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/useCurrency";

interface VehicleConsumption {
  vehicleId: string;
  plateNumber: string;
  make: string | null;
  model: string | null;
  totalLiters: number;
  totalCost: number;
  issueCount: number;
  avgLitersPerIssue: number;
}

interface PeriodConsumption {
  period: string;
  totalLiters: number;
  totalCost: number;
  issueCount: number;
}

const startOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const today = () => new Date().toISOString().slice(0, 10);

export default function FuelReportsPage() {
  const currency = useCurrency();
  const [tab, setTab] = useState<"vehicle" | "period">("vehicle");

  // By Vehicle
  const [vData, setVData] = useState<VehicleConsumption[]>([]);
  const [vLoading, setVLoading] = useState(false);
  const [vFrom, setVFrom] = useState(startOfMonth());
  const [vTo, setVTo] = useState(today());

  // By Period
  const [pData, setPData] = useState<PeriodConsumption[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("month");
  const [pFrom, setPFrom] = useState(startOfMonth());
  const [pTo, setPTo] = useState(today());

  const fetchByVehicle = useCallback(async () => {
    setVLoading(true);
    try {
      const params = new URLSearchParams({ from: new Date(vFrom).toISOString(), to: new Date(vTo).toISOString() });
      const res = await fetch(`/api/fuel/consumption-by-vehicle?${params}`);
      const json = await res.json();
      setVData(json.data ?? json);
    } catch { toast.error("Failed to load vehicle consumption"); }
    finally { setVLoading(false); }
  }, [vFrom, vTo]);

  const fetchByPeriod = useCallback(async () => {
    setPLoading(true);
    try {
      const params = new URLSearchParams({ groupBy, from: new Date(pFrom).toISOString(), to: new Date(pTo).toISOString() });
      const res = await fetch(`/api/fuel/consumption-by-period?${params}`);
      const json = await res.json();
      setPData(json.data ?? json);
    } catch { toast.error("Failed to load period consumption"); }
    finally { setPLoading(false); }
  }, [groupBy, pFrom, pTo]);

  useEffect(() => { if (tab === "vehicle") fetchByVehicle(); }, [tab, fetchByVehicle]);
  useEffect(() => { if (tab === "period") fetchByPeriod(); }, [tab, fetchByPeriod]);

  const vehicleColumns = [
    {
      key: "vehicle", header: "Vehicle",
      cell: (r: VehicleConsumption) => (
        <div>
          <p className="font-medium">{r.plateNumber}</p>
          {(r.make || r.model) && <p className="text-xs text-muted-foreground">{[r.make, r.model].filter(Boolean).join(" ")}</p>}
        </div>
      ),
    },
    { key: "totalLiters", header: "Total Liters", cell: (r: VehicleConsumption) => <span className="font-semibold">{r.totalLiters.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</span> },
    { key: "totalCost", header: "Total Cost", cell: (r: VehicleConsumption) => r.totalCost > 0 ? `${currency} ${r.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—" },
    { key: "avgLiters", header: "Avg L / Issue", cell: (r: VehicleConsumption) => `${(r.avgLitersPerIssue ?? 0).toFixed(1)} L` },
    { key: "issueCount", header: "Issues", cell: (r: VehicleConsumption) => <Badge variant="outline">{r.issueCount}</Badge> },
  ];

  const periodColumns = [
    { key: "period", header: "Period", cell: (r: PeriodConsumption) => <span className="font-mono text-sm">{r.period}</span> },
    { key: "totalLiters", header: "Total Liters", cell: (r: PeriodConsumption) => <span className="font-semibold">{r.totalLiters.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</span> },
    { key: "totalCost", header: "Total Cost", cell: (r: PeriodConsumption) => r.totalCost > 0 ? `${currency} ${r.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—" },
    { key: "issueCount", header: "Issues", cell: (r: PeriodConsumption) => <Badge variant="outline">{r.issueCount}</Badge> },
  ];

  return (
    <div>
      <PageHeader title="Fuel Reports" description="Consumption analysis by vehicle and time period" />

      <div className="flex gap-2 mb-6 border-b">
        {(["vehicle", "period"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t === "vehicle" ? "By Vehicle" : "By Period"}
          </button>
        ))}
      </div>

      {tab === "vehicle" && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div className="flex items-center gap-1.5">
              <Label className="text-sm">From</Label>
              <Input type="date" value={vFrom} onChange={(e) => setVFrom(e.target.value)} className="h-9 w-36" />
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-sm">To</Label>
              <Input type="date" value={vTo} onChange={(e) => setVTo(e.target.value)} className="h-9 w-36" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchByVehicle}>Refresh</Button>
          </div>
          {vLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading...</p>
          ) : vData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No fuel issues found for the selected period.</p>
          ) : (
            <div className="border rounded-md overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{vehicleColumns.map((c) => <th key={c.key} className="text-left px-4 py-2 font-medium text-muted-foreground">{c.header}</th>)}</tr>
                </thead>
                <tbody>
                  {vData.map((r) => (
                    <tr key={r.vehicleId} className="border-t hover:bg-muted/30">
                      {vehicleColumns.map((c) => <td key={c.key} className="px-4 py-2">{c.cell(r)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "period" && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div>
              <Label className="text-sm block mb-1">Group By</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as "day" | "week" | "month")}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-sm">From</Label>
              <Input type="date" value={pFrom} onChange={(e) => setPFrom(e.target.value)} className="h-9 w-36" />
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-sm">To</Label>
              <Input type="date" value={pTo} onChange={(e) => setPTo(e.target.value)} className="h-9 w-36" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchByPeriod}>Refresh</Button>
          </div>
          {pLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading...</p>
          ) : pData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No fuel issues found for the selected period.</p>
          ) : (
            <div className="border rounded-md overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{periodColumns.map((c) => <th key={c.key} className="text-left px-4 py-2 font-medium text-muted-foreground">{c.header}</th>)}</tr>
                </thead>
                <tbody>
                  {pData.map((r) => (
                    <tr key={r.period} className="border-t hover:bg-muted/30">
                      {periodColumns.map((c) => <td key={c.key} className="px-4 py-2">{c.cell(r)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
