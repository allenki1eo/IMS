"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";
import {
  Warehouse, Truck, Fuel, Wrench, ShoppingCart,
  Factory, FlaskConical, SendHorizonal, Landmark,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { useCurrency } from "@/hooks/useCurrency";

// Lazy-load recharts so the ~100kB library stays out of the initial bundle
const ReportBarChart = dynamic(
  () => import("./ReportsCharts").then((m) => m.ReportBarChart),
  { ssr: false, loading: () => <ChartSkeleton height={250} /> }
);

const MODULES = [
  { key: "warehouse", label: "Warehouse", icon: Warehouse },
  { key: "transport", label: "Transport", icon: Truck },
  { key: "fuel", label: "Fuel", icon: Fuel },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "procurement", label: "Procurement", icon: ShoppingCart },
  { key: "production", label: "Production", icon: Factory },
  { key: "qc", label: "Quality Control", icon: FlaskConical },
  { key: "dispatch", label: "Dispatch", icon: SendHorizonal },
  { key: "finance", label: "Finance", icon: Landmark },
];

export default function ReportsPage() {
  const currency = useCurrency();
  const [activeModule, setActiveModule] = useState("warehouse");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function fetchReport() {
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      toast.error("From date must be before to date");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      const query = params.toString();
      const res = await fetch(`/api/reports/${activeModule}${query ? `?${query}` : ""}`);
      const json = await res.json();
      if (res.ok) {
        setReport(json.data);
      } else {
        toast.error(json.error || json.message || "Failed to load report");
      }
    } catch {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport();
  }, [activeModule]);

  function formatDate(d: string) {
    if (!d) return "-";
    const date = new Date(d);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
  }

  function formatCurrency(n: number) {
    return `${currency} ${(n || 0).toLocaleString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="View detailed module reports for any date range" />

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
            <Button onClick={fetchReport} disabled={loading}>{loading ? "Loading..." : "Generate Report"}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {MODULES.map((mod) => (
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

      {loading && <LoadingState text={`Loading ${activeModule} report...`} />}

      {report && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {Object.entries(report.summary || {}).map(([key, value]) => (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {typeof value === "number" && ["value", "cost", "amount", "debit", "credit"].some((part) => key.toLowerCase().includes(part))
                      ? formatCurrency(value)
                      : typeof value === "number"
                      ? value.toLocaleString()
                      : String(value)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Module-specific charts and tables */}
          {activeModule === "warehouse" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Goods Received Notes</h3>
              <DataTable
                columns={[
                  { key: "reference", header: "GRN #" },
                  { key: "status", header: "Status", cell: (r: any) => <Badge>{r.status}</Badge> },
                  { key: "totalAmount", header: "Total", cell: (r: any) => formatCurrency(r.totalAmount) },
                  { key: "createdAt", header: "Date", cell: (r: any) => formatDate(r.createdAt) },
                ]}
                data={report.grns || []}
                emptyTitle="No GRNs in this period"
              />
            </div>
          )}

          {activeModule === "transport" && (
            <div className="space-y-4">
              {report.fuelConsumption?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Fuel Consumption by Vehicle</CardTitle></CardHeader>
                  <CardContent>
                    <ReportBarChart data={report.fuelConsumption} xKey="vehicle" dataKey="quantity" fill="#0088FE" />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeModule === "fuel" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Fuel Receipts</h3>
              <DataTable
                columns={[
                  { key: "tank", header: "Tank", cell: (r: any) => r.tank?.name },
                  { key: "quantityLiters", header: "Quantity (L)" },
                  { key: "totalCost", header: "Cost", cell: (r: any) => formatCurrency(r.totalCost) },
                  { key: "createdAt", header: "Date", cell: (r: any) => formatDate(r.createdAt) },
                ]}
                data={report.receipts || []}
                emptyTitle="No receipts in this period"
              />
              <h3 className="font-semibold">Fuel Issues</h3>
              <DataTable
                columns={[
                  { key: "vehicle", header: "Vehicle", cell: (r: any) => r.vehicle?.plateNumber },
                  { key: "quantityLiters", header: "Quantity (L)" },
                  { key: "totalCost", header: "Cost", cell: (r: any) => formatCurrency(r.totalCost) },
                  { key: "createdAt", header: "Date", cell: (r: any) => formatDate(r.createdAt) },
                ]}
                data={report.issues || []}
                emptyTitle="No issues in this period"
              />
            </div>
          )}

          {activeModule === "maintenance" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Work Orders</h3>
              <DataTable
                columns={[
                  { key: "reference", header: "Ref" },
                  { key: "vehicle", header: "Vehicle", cell: (r: any) => r.vehicle?.plateNumber },
                  { key: "status", header: "Status", cell: (r: any) => <Badge>{r.status}</Badge> },
                  { key: "actualCost", header: "Cost", cell: (r: any) => formatCurrency(r.actualCost) },
                  { key: "createdAt", header: "Date", cell: (r: any) => formatDate(r.createdAt) },
                ]}
                data={report.workOrders || []}
                emptyTitle="No work orders in this period"
              />
            </div>
          )}

          {activeModule === "procurement" && (
            <div className="space-y-4">
              {report.topSuppliers?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Top Suppliers by Spending</CardTitle></CardHeader>
                  <CardContent>
                    <ReportBarChart data={report.topSuppliers} xKey="supplier" dataKey="totalAmount" fill="#00C49F" />
                  </CardContent>
                </Card>
              )}
              <h3 className="font-semibold">Purchase Orders</h3>
              <DataTable
                columns={[
                  { key: "reference", header: "PO #" },
                  { key: "supplier", header: "Supplier", cell: (r: any) => r.supplier?.name },
                  { key: "status", header: "Status", cell: (r: any) => <Badge>{r.status}</Badge> },
                  { key: "totalAmount", header: "Total", cell: (r: any) => formatCurrency(r.totalAmount) },
                  { key: "createdAt", header: "Date", cell: (r: any) => formatDate(r.createdAt) },
                ]}
                data={report.orders || []}
                emptyTitle="No orders in this period"
              />
            </div>
          )}

          {activeModule === "production" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Production Batches</h3>
              <DataTable
                columns={[
                  { key: "reference", header: "Batch #" },
                  { key: "line", header: "Line", cell: (r: any) => r.line?.name },
                  { key: "recipe", header: "Recipe", cell: (r: any) => r.recipe?.name },
                  { key: "status", header: "Status", cell: (r: any) => <Badge>{r.status}</Badge> },
                  { key: "plannedQty", header: "Planned" },
                  { key: "actualQty", header: "Actual" },
                ]}
                data={report.batches || []}
                emptyTitle="No batches in this period"
              />
            </div>
          )}

          {activeModule === "qc" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Quality Tests</h3>
              <DataTable
                columns={[
                  { key: "reference", header: "Ref" },
                  { key: "standard", header: "Standard", cell: (r: any) => r.standard?.name },
                  { key: "item", header: "Item", cell: (r: any) => r.item?.name },
                  {
                    key: "result",
                    header: "Result",
                    cell: (r: any) => r.result ? (
                      <Badge variant={r.result === "PASS" ? "default" : "destructive"}>{r.result}</Badge>
                    ) : "-",
                  },
                  { key: "createdAt", header: "Date", cell: (r: any) => formatDate(r.createdAt) },
                ]}
                data={report.tests || []}
                emptyTitle="No tests in this period"
              />
              <h3 className="font-semibold">Non-Conformances</h3>
              <DataTable
                columns={[
                  { key: "reference", header: "Ref" },
                  { key: "severity", header: "Severity", cell: (r: any) => <Badge variant={r.severity === "HIGH" ? "destructive" : "secondary"}>{r.severity}</Badge> },
                  { key: "status", header: "Status", cell: (r: any) => <Badge>{r.status}</Badge> },
                  { key: "createdAt", header: "Date", cell: (r: any) => formatDate(r.createdAt) },
                ]}
                data={report.ncrs || []}
                emptyTitle="No NCRs in this period"
              />
            </div>
          )}

          {activeModule === "dispatch" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Dispatch Orders</h3>
              <DataTable
                columns={[
                  { key: "reference", header: "DO #" },
                  { key: "customerName", header: "Customer" },
                  { key: "status", header: "Status", cell: (r: any) => <Badge>{r.status}</Badge> },
                  { key: "totalQuantity", header: "Qty" },
                  { key: "totalAmount", header: "Total", cell: (r: any) => formatCurrency(r.totalAmount) },
                  { key: "createdAt", header: "Date", cell: (r: any) => formatDate(r.createdAt) },
                ]}
                data={report.orders || []}
                emptyTitle="No orders in this period"
              />
            </div>
          )}

          {activeModule === "finance" && (
            <div className="space-y-4">
              <h3 className="font-semibold">Journal Entries</h3>
              <DataTable
                columns={[
                  { key: "reference", header: "Ref" },
                  { key: "description", header: "Description" },
                  { key: "totalDebit", header: "Debit", cell: (r: any) => formatCurrency(r.totalDebit) },
                  { key: "totalCredit", header: "Credit", cell: (r: any) => formatCurrency(r.totalCredit) },
                  { key: "entryDate", header: "Date", cell: (r: any) => formatDate(r.entryDate) },
                ]}
                data={report.journalEntries || []}
                emptyTitle="No journal entries in this period"
              />
              <h3 className="font-semibold">Payments</h3>
              <DataTable
                columns={[
                  { key: "paymentNumber", header: "Number" },
                  { key: "type", header: "Type" },
                  { key: "partyName", header: "Party" },
                  { key: "amount", header: "Amount", cell: (r: any) => formatCurrency(r.amount) },
                  { key: "status", header: "Status", cell: (r: any) => <Badge>{r.status}</Badge> },
                ]}
                data={report.payments || []}
                emptyTitle="No payments in this period"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
