"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatLiters, formatMoney } from "../_components/fuel-ui";

interface VehicleReportRow {
  id: string;
  vehicleId: string;
  plateNumber: string;
  make: string;
  model: string;
  totalLiters: number;
  totalCost: number;
  issueCount: number;
}

interface PeriodReportRow {
  id: string;
  period: string;
  totalLiters: number;
  totalCost: number;
  issueCount: number;
}

export default function FuelReportsPage() {
  const [vehicleRows, setVehicleRows] = useState<VehicleReportRow[]>([]);
  const [periodRows, setPeriodRows] = useState<PeriodReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    groupBy: "month",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    const periodParams = new URLSearchParams(params);
    periodParams.set("groupBy", filters.groupBy);

    try {
      const [vehicleRes, periodRes] = await Promise.all([
        fetch(`/api/fuel/consumption-by-vehicle?${params}`),
        fetch(`/api/fuel/consumption-by-period?${periodParams}`),
      ]);
      const [vehicleJson, periodJson] = await Promise.all([vehicleRes.json(), periodRes.json()]);
      setVehicleRows((vehicleJson.data ?? []).map((row: Omit<VehicleReportRow, "id">) => ({ ...row, id: row.vehicleId })));
      setPeriodRows((periodJson.data ?? []).map((row: Omit<PeriodReportRow, "id">) => ({ ...row, id: row.period })));
    } catch {
      toast.error("Failed to load fuel reports");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  function set(field: string, value: string) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  const vehicleColumns = [
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row: VehicleReportRow) => <span className="font-medium">{row.plateNumber} - {row.make} {row.model}</span>,
    },
    {
      key: "liters",
      header: "Total Liters",
      cell: (row: VehicleReportRow) => <span>{formatLiters(row.totalLiters)}</span>,
    },
    {
      key: "cost",
      header: "Total Cost",
      cell: (row: VehicleReportRow) => <span className="text-sm text-muted-foreground">{formatMoney(row.totalCost)}</span>,
    },
    {
      key: "issues",
      header: "Issues",
      cell: (row: VehicleReportRow) => <span>{row.issueCount}</span>,
    },
  ];

  const periodColumns = [
    {
      key: "period",
      header: "Period",
      cell: (row: PeriodReportRow) => <span className="font-medium">{row.period}</span>,
    },
    {
      key: "liters",
      header: "Total Liters",
      cell: (row: PeriodReportRow) => <span>{formatLiters(row.totalLiters)}</span>,
    },
    {
      key: "cost",
      header: "Total Cost",
      cell: (row: PeriodReportRow) => <span className="text-sm text-muted-foreground">{formatMoney(row.totalCost)}</span>,
    },
    {
      key: "issues",
      header: "Issues",
      cell: (row: PeriodReportRow) => <span>{row.issueCount}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Fuel Reports" description="Analyze fuel consumption by vehicle and period" />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={filters.from} onChange={(e) => set("from", e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={filters.to} onChange={(e) => set("to", e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label>Group By</Label>
          <Select value={filters.groupBy} onValueChange={(value) => set("groupBy", value)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={load}>Refresh</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-3">Consumption By Vehicle</h2>
          <DataTable
            columns={vehicleColumns}
            data={vehicleRows}
            loading={loading}
            emptyTitle="No vehicle consumption"
            emptyDescription="Fuel issues will appear here once recorded."
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Consumption By Period</h2>
          <DataTable
            columns={periodColumns}
            data={periodRows}
            loading={loading}
            emptyTitle="No period consumption"
            emptyDescription="Fuel issues will appear here once recorded."
          />
        </div>
      </div>
    </div>
  );
}

