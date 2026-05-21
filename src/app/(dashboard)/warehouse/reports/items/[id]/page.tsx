"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Package, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface LedgerEntry {
  id: string;
  createdAt: string;
  transactionType: string;
  quantity: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  warehouse: { name: string } | null;
}

interface DailySummary {
  date: string;
  openingBalance: number;
  inQty: number;
  outQty: number;
  netMovement: number;
  closingBalance: number;
}

interface ItemDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  itemType: string;
  category?: { id: string; name: string } | null;
  uom?: { id: string; name: string; symbol: string } | null;
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL: "Raw Material",
  FINISHED_GOOD: "Finished Good",
  CONSUMABLE: "Consumable",
  SPARE_PART: "Spare Part",
  PACKAGING: "Packaging",
};

const TXN_LABELS: Record<string, string> = {
  RECEIPT: "GRN Receipt",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  ADJUSTMENT_IN: "Adjustment In",
  ADJUSTMENT_OUT: "Adjustment Out",
};

function txnDirection(type: string): "IN" | "OUT" | "NEUTRAL" {
  if (["RECEIPT", "TRANSFER_IN", "ADJUSTMENT_IN"].includes(type)) return "IN";
  if (["TRANSFER_OUT", "ADJUSTMENT_OUT"].includes(type)) return "OUT";
  return "NEUTRAL";
}

const TABS = ["Ledger", "Daily Summary"] as const;
type Tab = (typeof TABS)[number];

export default function ItemLedgerReportPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Ledger");

  useEffect(() => {
    fetch(`/api/warehouse/reports/items/${id}/ledger`)
      .then((r) => r.json())
      .then((d) => {
        const data = d.data ?? d;
        setItem(data.item);
        setEntries(data.entries ?? []);
        setDailySummary(data.dailySummary ?? []);
      })
      .catch(() => toast.error("Failed to load ledger"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState />;
  if (!item) return <div className="text-muted-foreground">Item not found.</div>;

  const currentBalance = entries.length > 0 ? entries[entries.length - 1].balanceAfter : 0;

  return (
    <div>
      <PageHeader
        title={item.name}
        description={`Code: ${item.code} · ${ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}`}
        actions={
          <Button variant="outline" asChild>
            <Link href={item.category ? `/warehouse/reports/category/${item.category.id}` : "/warehouse/reports"}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Balance</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {currentBalance.toLocaleString()} <span className="text-base font-normal text-muted-foreground">{item.uom?.symbol ?? ""}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Category</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{item.category?.name ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Movements</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{entries.length} entries</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b mb-4 flex gap-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Ledger" && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Particulars</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">In</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Out</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No stock movements recorded for this item.
                  </td>
                </tr>
              )}
              {entries.map((entry) => {
                const dir = txnDirection(entry.transactionType);
                const inQty = dir === "IN" ? Math.abs(entry.quantity) : 0;
                const outQty = dir === "OUT" ? Math.abs(entry.quantity) : 0;
                return (
                  <tr key={entry.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.createdAt), "dd MMM yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {entry.referenceType ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{TXN_LABELS[entry.transactionType] ?? entry.transactionType}</span>
                      {entry.warehouse && (
                        <span className="text-muted-foreground text-xs block">{entry.warehouse.name}</span>
                      )}
                      {entry.notes && (
                        <span className="text-muted-foreground text-xs block">{entry.notes}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">
                      {inQty > 0 ? `+${inQty.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-semibold">
                      {outQty > 0 ? `-${outQty.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {entry.balanceAfter.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "Daily Summary" && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Opening</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">In</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Out</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Closing</th>
              </tr>
            </thead>
            <tbody>
              {dailySummary.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No daily summary available.
                  </td>
                </tr>
              )}
              {dailySummary.map((day) => (
                <tr key={day.date} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {format(new Date(day.date + "T00:00:00"), "dd MMM yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {day.openingBalance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 font-semibold">
                    {day.inQty > 0 ? `+${day.inQty.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 font-semibold">
                    {day.outQty > 0 ? `-${day.outQty.toLocaleString()}` : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${day.netMovement >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {day.netMovement >= 0 ? "+" : ""}{day.netMovement.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {day.closingBalance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
