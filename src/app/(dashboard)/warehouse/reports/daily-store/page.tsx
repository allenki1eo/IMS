"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { Printer, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";

interface ReportRow {
  itemId: string;
  code: string;
  name: string;
  categoryName: string;
  uomSymbol: string;
  opening: number;
  receivedFromSupplier: number;
  returnedToSupplier: number;
  issuedToProduction: number;
  returnedFromProduction: number;
  otherMovement: number;
  closing: number;
  stockTakeQty: number | null;
  confirmation: string | null;
  projectedWeeklyUsage: number | null;
  leadTimeWeeks: number | null;
  weeksToDepletion: number | null;
}

interface ReportData {
  date: string;
  groups: Array<{ category: string; rows: ReportRow[] }>;
}

interface WarehouseOption {
  id: string;
  name: string;
}

function num(v: number) {
  if (v === 0) return "-";
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function depletionClass(weeks: number | null, leadTime: number | null) {
  if (weeks == null) return "";
  if (leadTime != null && weeks <= leadTime) return "text-red-600 font-bold";
  if (leadTime != null && weeks <= leadTime * 2) return "text-amber-600 font-semibold";
  return "";
}

export default function DailyStoreReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/warehouses?pageSize=100")
      .then((r) => r.json())
      .then((d) => setWarehouses(d.data ?? []))
      .catch(() => {});
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (warehouseId !== "all") params.set("warehouseId", warehouseId);
      const res = await fetch(`/api/warehouse/reports/daily-store?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load report");
      setReport(json.data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [date, warehouseId]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const warehouseName = warehouseId === "all"
    ? "All Warehouses"
    : warehouses.find((w) => w.id === warehouseId)?.name ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Store Report"
        description="Movement of stock — opening, received, issued to production, closing, weeks to depletion"
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-4 print:hidden">
        <div className="space-y-1">
          <Label>Report Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <Label>Warehouse</Label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={loadReport} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center">
        <h1 className="text-lg font-bold">DAILY STORE REPORT — {warehouseName}</h1>
        <p className="text-sm">Movement of Stock as on {format(new Date(date), "dd.MM.yyyy")}</p>
      </div>

      {loading && !report ? (
        <div className="p-8 text-muted-foreground">Loading report...</div>
      ) : report ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-muted text-left text-muted-foreground">
                <th className="border px-2 py-1.5 min-w-[180px]">Item</th>
                <th className="border px-2 py-1.5 text-right">Opening</th>
                <th className="border px-2 py-1.5 text-right">Add: Received From Supplier</th>
                <th className="border px-2 py-1.5 text-right">Less: Returned To Supplier</th>
                <th className="border px-2 py-1.5 text-right">Less: Issued To Production</th>
                <th className="border px-2 py-1.5 text-right">Add: Return From Production</th>
                <th className="border px-2 py-1.5 text-right">Other +/-</th>
                <th className="border px-2 py-1.5 text-right">Closing</th>
                <th className="border px-2 py-1.5 text-right">Stock Take</th>
                <th className="border px-2 py-1.5">Confirmation</th>
                <th className="border px-2 py-1.5 text-right">Weekly Usage</th>
                <th className="border px-2 py-1.5">UoM</th>
                <th className="border px-2 py-1.5 text-right">Lead Time (wks)</th>
                <th className="border px-2 py-1.5 text-right">Weeks to Depletion</th>
              </tr>
            </thead>
            <tbody>
              {report.groups.map((group, gi) => {
                const t = group.rows.reduce(
                  (acc, r) => ({
                    opening: acc.opening + r.opening,
                    received: acc.received + r.receivedFromSupplier,
                    retSup: acc.retSup + r.returnedToSupplier,
                    issued: acc.issued + r.issuedToProduction,
                    retProd: acc.retProd + r.returnedFromProduction,
                    other: acc.other + r.otherMovement,
                    closing: acc.closing + r.closing,
                  }),
                  { opening: 0, received: 0, retSup: 0, issued: 0, retProd: 0, other: 0, closing: 0 }
                );
                return (
                  <Fragment key={group.category}>
                    {group.rows.map((row) => (
                      <tr key={row.itemId} className="border-b hover:bg-muted/40">
                        <td className="border px-2 py-1 font-medium">{row.name}</td>
                        <td className="border px-2 py-1 text-right">{num(row.opening)}</td>
                        <td className="border px-2 py-1 text-right">{num(row.receivedFromSupplier)}</td>
                        <td className="border px-2 py-1 text-right">{num(row.returnedToSupplier)}</td>
                        <td className="border px-2 py-1 text-right">{num(row.issuedToProduction)}</td>
                        <td className="border px-2 py-1 text-right">{num(row.returnedFromProduction)}</td>
                        <td className="border px-2 py-1 text-right">{num(row.otherMovement)}</td>
                        <td className="border px-2 py-1 text-right font-semibold">{num(row.closing)}</td>
                        <td className="border px-2 py-1 text-right">{row.stockTakeQty != null ? num(row.stockTakeQty) : ""}</td>
                        <td className="border px-2 py-1 text-amber-700 font-medium">{row.confirmation ?? ""}</td>
                        <td className="border px-2 py-1 text-right">{row.projectedWeeklyUsage != null ? num(row.projectedWeeklyUsage) : ""}</td>
                        <td className="border px-2 py-1 text-muted-foreground">{row.uomSymbol}</td>
                        <td className="border px-2 py-1 text-right">{row.leadTimeWeeks ?? ""}</td>
                        <td className={`border px-2 py-1 text-right ${depletionClass(row.weeksToDepletion, row.leadTimeWeeks)}`}>
                          {row.weeksToDepletion != null ? row.weeksToDepletion.toFixed(1) : ""}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/70 font-bold">
                      <td className="border px-2 py-1">{gi + 1}. TOTAL {group.category.toUpperCase()}</td>
                      <td className="border px-2 py-1 text-right">{num(t.opening)}</td>
                      <td className="border px-2 py-1 text-right">{num(t.received)}</td>
                      <td className="border px-2 py-1 text-right">{num(t.retSup)}</td>
                      <td className="border px-2 py-1 text-right">{num(t.issued)}</td>
                      <td className="border px-2 py-1 text-right">{num(t.retProd)}</td>
                      <td className="border px-2 py-1 text-right">{num(t.other)}</td>
                      <td className="border px-2 py-1 text-right">{num(t.closing)}</td>
                      <td className="border px-2 py-1" colSpan={6}></td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-muted-foreground">No report data.</div>
      )}
    </div>
  );
}
