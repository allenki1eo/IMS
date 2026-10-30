"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";
import {
  Warehouse, Truck, Fuel, Wrench, ShoppingCart,
  Factory, FlaskConical, SendHorizonal, Landmark,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/hooks/useCurrency";
import {
  LineFamilyFilter,
  type LineFamilyValue,
} from "@/components/reports/LineFamilyFilter";
import { ReportDocument } from "@/components/reports/paper/ReportDocument";
import { formatPeriod, table, type ReportBlock } from "@/components/reports/paper/types";

// Lazy-load recharts so the ~100kB library stays out of the initial bundle
const ReportBarChart = dynamic(
  () => import("./ReportsCharts").then((m) => m.ReportBarChart),
  { ssr: false, loading: () => <ChartSkeleton height={250} /> }
);

const PRIMARY_MODULES = [
  { key: "warehouse", label: "Stock", icon: Warehouse, title: "Stock & Goods Receipt Report", code: "WH" },
  { key: "production", label: "Production", icon: Factory, title: "Production Report", code: "PRD" },
  { key: "dispatch", label: "Dispatch", icon: SendHorizonal, title: "Dispatch Report", code: "DSP" },
  { key: "finance", label: "Finance spend", icon: Landmark, title: "Finance Activity Report", code: "FIN" },
];

/** Thin / orphan stubs kept behind "More" — not on the default decision surface. */
const SECONDARY_MODULES = [
  { key: "qc", label: "Quality Control", icon: FlaskConical, title: "Quality Control Report", code: "QC" },
  { key: "transport", label: "Transport", icon: Truck, title: "Transport Report", code: "TRN" },
  { key: "fuel", label: "Fuel", icon: Fuel, title: "Fuel Receipts & Issues Report", code: "FUEL" },
  { key: "maintenance", label: "Maintenance", icon: Wrench, title: "Maintenance Report", code: "MNT" },
  { key: "procurement", label: "Procurement", icon: ShoppingCart, title: "Procurement Report", code: "PRC" },
];

const LINE_FAMILY_LABEL: Record<LineFamilyValue, string> = { ALL: "All lines", BREWING: "Brewing", SPIRITS: "Spirits" };

const ACRONYMS = new Set(["grn", "grns", "po", "pos", "ncr", "ncrs", "qc", "do", "wo"]);

/** totalGRNs → Total GRNs, grnTotalValue → GRN total value */
function labelFromKey(key: string) {
  const words = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z]{2,})/g, "$1 $2")
    .split(/[\s_]+/)
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase().replace(/S$/, "s") : w.toLowerCase()));
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** PARTIALLY_RECEIVED → Partially received */
function humanize(v: unknown) {
  if (typeof v !== "string" || !v) return v == null ? "" : String(v);
  const s = v.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const MONEY_KEYS = ["value", "cost", "amount", "debit", "credit", "spend"];

/** Turn an API report payload into document sections for the given module. */
function buildBlocks(module: string, report: any): ReportBlock[] {
  const summary = Object.entries(report.summary || {}).map(([key, value]) => ({
    label: labelFromKey(key),
    value: value as number | string,
    format: (typeof value === "number"
      ? MONEY_KEYS.some((p) => key.toLowerCase().includes(p)) ? "money" : "number"
      : "text") as "money" | "number" | "text",
  }));
  const blocks: ReportBlock[] = summary.length ? [{ kind: "keyFigures", title: "Summary", items: summary }] : [];
  const chart = (title: string, data: object[], xKey: string, dataKey: string, caption: string): ReportBlock => ({
    kind: "figure",
    title,
    caption,
    node: <ReportBarChart data={data} xKey={xKey} dataKey={dataKey} fill="hsl(var(--foreground) / 0.75)" />,
  });

  switch (module) {
    case "warehouse":
      blocks.push(table<any>({
        title: "Goods Received Notes",
        rows: report.grns || [],
        emptyText: "No goods were received in this period.",
        columns: [
          { header: "GRN no.", value: (r) => r.reference, format: "code" },
          { header: "Date", value: (r) => r.createdAt, format: "date" },
          { header: "Status", value: (r) => humanize(r.status) },
          { header: "Total", value: (r) => r.totalAmount, format: "money", total: true },
        ],
      }));
      break;
    case "transport":
      if (report.fuelConsumption?.length) {
        blocks.push(chart("Fuel Consumption by Vehicle", report.fuelConsumption, "vehicle", "quantity", "Litres issued per vehicle in the period"));
        blocks.push(table<any>({
          title: "Fuel Consumption Detail",
          rows: report.fuelConsumption,
          columns: [
            { header: "Vehicle", value: (r) => r.vehicle },
            { header: "Quantity (L)", value: (r) => r.quantity, format: "number", total: true },
          ],
        }));
      }
      break;
    case "fuel":
      blocks.push(table<any>({
        title: "Fuel Receipts",
        rows: report.receipts || [],
        emptyText: "No fuel was received in this period.",
        columns: [
          { header: "Date", value: (r) => r.createdAt, format: "date" },
          { header: "Tank", value: (r) => r.tank?.name },
          { header: "Quantity (L)", value: (r) => r.quantityLiters, format: "number", total: true },
          { header: "Cost", value: (r) => r.totalCost, format: "money", total: true },
        ],
      }));
      blocks.push(table<any>({
        title: "Fuel Issues",
        rows: report.issues || [],
        emptyText: "No fuel was issued in this period.",
        columns: [
          { header: "Date", value: (r) => r.createdAt, format: "date" },
          { header: "Vehicle", value: (r) => r.vehicle?.plateNumber, format: "code" },
          { header: "Quantity (L)", value: (r) => r.quantityLiters, format: "number", total: true },
          { header: "Cost", value: (r) => r.totalCost, format: "money", total: true },
        ],
      }));
      break;
    case "maintenance":
      blocks.push(table<any>({
        title: "Work Orders",
        rows: report.workOrders || [],
        emptyText: "No work orders in this period.",
        columns: [
          { header: "Ref", value: (r) => r.reference, format: "code" },
          { header: "Date", value: (r) => r.createdAt, format: "date" },
          { header: "Vehicle", value: (r) => r.vehicle?.plateNumber },
          { header: "Status", value: (r) => humanize(r.status) },
          { header: "Cost", value: (r) => r.actualCost, format: "money", total: true },
        ],
      }));
      break;
    case "procurement":
      if (report.topSuppliers?.length) {
        blocks.push(chart("Top Suppliers by Spend", report.topSuppliers, "supplier", "totalAmount", "Purchase order value by supplier"));
      }
      blocks.push(table<any>({
        title: "Purchase Orders",
        rows: report.orders || [],
        emptyText: "No purchase orders in this period.",
        columns: [
          { header: "PO no.", value: (r) => r.reference, format: "code" },
          { header: "Date", value: (r) => r.createdAt, format: "date" },
          { header: "Supplier", value: (r) => r.supplier?.name },
          { header: "Status", value: (r) => humanize(r.status) },
          { header: "Total", value: (r) => r.totalAmount, format: "money", total: true },
        ],
      }));
      break;
    case "production":
      blocks.push(table<any>({
        title: "Production Batches",
        rows: report.batches || [],
        emptyText: "No production batches in this period.",
        columns: [
          { header: "Batch no.", value: (r) => r.reference, format: "code" },
          { header: "Line", value: (r) => r.line?.name },
          { header: "Recipe", value: (r) => r.recipe?.name },
          { header: "Status", value: (r) => humanize(r.status) },
          { header: "Planned", value: (r) => r.plannedQty, format: "number", total: true },
          { header: "Actual", value: (r) => r.actualQty, format: "number", total: true },
        ],
      }));
      break;
    case "qc":
      blocks.push(table<any>({
        title: "Quality Tests",
        rows: report.tests || [],
        emptyText: "No quality tests in this period.",
        columns: [
          { header: "Ref", value: (r) => r.reference, format: "code" },
          { header: "Date", value: (r) => r.createdAt, format: "date" },
          { header: "Standard", value: (r) => r.standard?.name },
          { header: "Item", value: (r) => r.item?.name },
          { header: "Result", value: (r) => humanize(r.result) },
        ],
      }));
      blocks.push(table<any>({
        title: "Non-Conformances",
        rows: report.ncrs || [],
        emptyText: "No non-conformances were raised in this period.",
        columns: [
          { header: "Ref", value: (r) => r.reference, format: "code" },
          { header: "Date", value: (r) => r.createdAt, format: "date" },
          { header: "Severity", value: (r) => humanize(r.severity) },
          { header: "Status", value: (r) => humanize(r.status) },
        ],
      }));
      break;
    case "dispatch":
      blocks.push(table<any>({
        title: "Dispatch Orders",
        rows: report.orders || [],
        emptyText: "No dispatch orders in this period.",
        columns: [
          { header: "DO no.", value: (r) => r.reference, format: "code" },
          { header: "Date", value: (r) => r.createdAt, format: "date" },
          { header: "Customer", value: (r) => r.customerName },
          { header: "Status", value: (r) => humanize(r.status) },
          { header: "Qty", value: (r) => r.totalQuantity, format: "number", total: true },
          { header: "Total", value: (r) => r.totalAmount, format: "money", total: true },
        ],
      }));
      break;
    case "finance":
      blocks.push(table<any>({
        title: "Journal Entries",
        rows: report.journalEntries || [],
        emptyText: "No journal entries in this period.",
        columns: [
          { header: "Ref", value: (r) => r.reference, format: "code" },
          { header: "Date", value: (r) => r.entryDate, format: "date" },
          { header: "Description", value: (r) => r.description, width: "36%" },
          { header: "Debit", value: (r) => r.totalDebit, format: "money", total: true },
          { header: "Credit", value: (r) => r.totalCredit, format: "money", total: true },
        ],
      }));
      blocks.push(table<any>({
        title: "Payments",
        rows: report.payments || [],
        emptyText: "No payments in this period.",
        columns: [
          { header: "Number", value: (r) => r.paymentNumber, format: "code" },
          { header: "Type", value: (r) => humanize(r.type) },
          { header: "Party", value: (r) => r.partyName },
          { header: "Status", value: (r) => humanize(r.status) },
          { header: "Amount", value: (r) => r.amount, format: "money", total: true },
        ],
      }));
      break;
  }
  return blocks;
}

const MODULES = [...PRIMARY_MODULES, ...SECONDARY_MODULES];

export default function ReportsPage() {
  const currency = useCurrency();
  const [activeModule, setActiveModule] = useState("warehouse");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [lineFamily, setLineFamily] = useState<LineFamilyValue>("ALL");
  const [showMore, setShowMore] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [reportModule, setReportModule] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function fetchReport(moduleKey: string = activeModule) {
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      toast.error("From date must be before to date");
      return;
    }

    setLoading(true);
    setReport(null);
    setReportModule(null); // clear previous module data so tabs never show stale numbers
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (
        lineFamily !== "ALL" &&
        ["production", "warehouse", "dispatch"].includes(moduleKey)
      ) {
        params.set("lineFamily", lineFamily);
      }
      const query = params.toString();
      const res = await fetch(`/api/reports/${moduleKey}${query ? `?${query}` : ""}`);
      const json = await res.json();
      if (res.ok) {
        setReport(json.data ?? null);
        setReportModule(moduleKey);
        setLoadError(null);
      } else {
        setReport(null);
        setReportModule(null);
        const msg = json.error || json.message || "Failed to load report";
        setLoadError(msg);
        toast.error(msg);
      }
    } catch {
      setReport(null);
      setReportModule(null);
      const msg = "Failed to load report";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport(activeModule);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on module / lineFamily change
  }, [activeModule, lineFamily]);

  const moduleMeta = MODULES.find((m) => m.key === activeModule)!;
  const usesLineFamily = ["production", "warehouse", "dispatch"].includes(activeModule);

  return (
    <div className="space-y-6">
      <div className="no-print space-y-6">
      <PageHeader title="Reports" description="Formal reports for stock, production, dispatch, and finance — print or save as PDF with letterhead." />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <Button onClick={() => fetchReport()} disabled={loading}>{loading ? "Loading..." : "Generate Report"}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 items-center">
        {PRIMARY_MODULES.map((mod) => (
          <Button
            key={mod.key}
            variant={activeModule === mod.key ? "default" : "outline"}
            onClick={() => setActiveModule(mod.key)}
            className="flex items-center gap-2"
          >
            <mod.icon className="h-4 w-4" />
            {mod.label}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? "Hide more" : "More"}
        </Button>
        {showMore &&
          SECONDARY_MODULES.map((mod) => (
            <Button
              key={mod.key}
              variant={activeModule === mod.key ? "default" : "outline"}
              onClick={() => setActiveModule(mod.key)}
              className="flex items-center gap-2"
            >
              <mod.icon className="h-4 w-4" />
              {mod.label}
            </Button>
          ))}
      </div>

      {usesLineFamily && (
        <LineFamilyFilter value={lineFamily} onChange={setLineFamily} />
      )}
      </div>

      {loading && <LoadingState text={`Loading ${activeModule} report...`} />}

      {!loading && loadError && (
        <ErrorState
          title={`Could not load ${activeModule} report`}
          description="The report query failed. This is not the same as an empty period — retry or check the API/database."
          error={loadError}
          onRetry={() => fetchReport(activeModule)}
        />
      )}

      {!loading && !loadError && report && reportModule === activeModule && (
        <ReportDocument
          meta={{
            title: moduleMeta.title,
            code: moduleMeta.code,
            period: formatPeriod(fromDate, toDate),
            currency,
            filters: usesLineFamily && lineFamily !== "ALL" ? [`Line family: ${LINE_FAMILY_LABEL[lineFamily]}`] : undefined,
          }}
          blocks={buildBlocks(activeModule, report)}
        />
      )}
    </div>
  );
}
