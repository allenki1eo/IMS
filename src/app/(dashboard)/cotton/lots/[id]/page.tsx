"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Bale {
  id: string;
  baleNumber: string;
  weight: number;
  grade: string;
  ginnery?: string | null;
}

interface ContractLine {
  id: string;
  contract: {
    id: string;
    contractNumber: string;
    status: string;
    pricePerKg: number;
    buyer: { id: string; name: string };
  };
}

interface Lot {
  id: string;
  lotNumber: string;
  status: string;
  totalWeight: number;
  baleCount: number;
  description?: string | null;
  season: { id: string; name: string };
  bales: Bale[];
  contractLines: ContractLine[];
}

interface UnassignedBale {
  id: string;
  baleNumber: string;
  weight: number;
  grade: string;
  ginnery?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-yellow-100 text-yellow-800",
  INVOICED: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function LotDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [lot, setLot] = useState<Lot | null>(null);
  const [loading, setLoading] = useState(true);
  const [addBalesOpen, setAddBalesOpen] = useState(false);
  const [unassignedBales, setUnassignedBales] = useState<UnassignedBale[]>([]);
  const [selectedBaleIds, setSelectedBaleIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function loadLot() {
    setLoading(true);
    fetch(`/api/cotton/lots/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setLot(d.data);
        else toast.error("Lot not found");
      })
      .catch(() => toast.error("Failed to load lot"))
      .finally(() => setLoading(false));
  }

  useEffect(loadLot, [id]);

  async function loadUnassignedBales() {
    if (!lot) return;
    const res = await fetch(`/api/cotton/bales?seasonId=${lot.season.id}&unassigned=true&pageSize=100`);
    const d = await res.json();
    if (d.success) setUnassignedBales(d.data);
  }

  async function handleAddBales() {
    if (selectedBaleIds.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cotton/lots/${id}/bales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baleIds: selectedBaleIds }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`Added ${selectedBaleIds.length} bale(s)`);
        setAddBalesOpen(false);
        setSelectedBaleIds([]);
        loadLot();
      } else {
        toast.error(d.error ?? "Failed to add bales");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveBale(baleId: string) {
    try {
      const res = await fetch(`/api/cotton/lots/${id}/bales`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baleId }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("Bale removed");
        loadLot();
      } else {
        toast.error(d.error ?? "Failed to remove bale");
      }
    } catch {
      toast.error("Failed to remove bale");
    }
  }

  function toggleBale(baleId: string) {
    setSelectedBaleIds((prev) =>
      prev.includes(baleId) ? prev.filter((id) => id !== baleId) : [...prev, baleId]
    );
  }

  if (loading) return <LoadingState />;
  if (!lot) return <div className="p-4">Lot not found.</div>;

  return (
    <div>
      <PageHeader
        title={lot.lotNumber}
        description={lot.description ?? lot.season.name}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/cotton/lots"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
            </Button>
            {lot.status === "OPEN" && (
              <Button
                onClick={() => {
                  setAddBalesOpen(true);
                  loadUnassignedBales();
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Bales
              </Button>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Status</CardTitle></CardHeader>
          <CardContent>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-medium ${STATUS_COLORS[lot.status] ?? "bg-gray-100"}`}>
              {lot.status}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Season</CardTitle></CardHeader>
          <CardContent><p className="font-semibold">{lot.season.name}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Bales</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{lot.baleCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Total Weight</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{lot.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</p></CardContent>
        </Card>
      </div>

      {/* Contract info */}
      {lot.contractLines.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Contract</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {lot.contractLines.map((cl) => (
              <div key={cl.id} className="flex items-center gap-4 text-sm">
                <Link href={`/cotton/contracts/${cl.contract.id}`} className="font-medium hover:underline text-primary">
                  {cl.contract.contractNumber}
                </Link>
                <span className="text-muted-foreground">{cl.contract.buyer.name}</span>
                <span className="text-muted-foreground">${cl.contract.pricePerKg}/kg</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[cl.contract.status] ?? ""}`}>
                  {cl.contract.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Bales table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bales in this Lot</CardTitle>
        </CardHeader>
        <CardContent>
          {lot.bales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No bales assigned yet.
              {lot.status === "OPEN" && " Click \"Add Bales\" to assign bales to this lot."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Bale Number</th>
                    <th className="text-right py-2 pr-4 font-medium">Weight (kg)</th>
                    <th className="text-left py-2 pr-4 font-medium">Grade</th>
                    <th className="text-left py-2 pr-4 font-medium">Ginnery</th>
                    {lot.status === "OPEN" && <th className="py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {lot.bales.map((bale) => (
                    <tr key={bale.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{bale.baleNumber}</code>
                      </td>
                      <td className="py-2 pr-4 text-right">{bale.weight.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="py-2 pr-4">{bale.grade}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{bale.ginnery ?? "-"}</td>
                      {lot.status === "OPEN" && (
                        <td className="py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBale(bale.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Bales Dialog */}
      <Dialog open={addBalesOpen} onOpenChange={setAddBalesOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Bales to {lot.lotNumber}</DialogTitle></DialogHeader>
          {unassignedBales.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No unassigned bales in season {lot.season.name}.
            </p>
          ) : (
            <div className="space-y-2 py-2">
              <p className="text-sm text-muted-foreground mb-3">
                Select bales to add. Showing unassigned bales for season {lot.season.name}.
              </p>
              {unassignedBales.map((bale) => (
                <label key={bale.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBaleIds.includes(bale.id)}
                    onChange={() => toggleBale(bale.id)}
                  />
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{bale.baleNumber}</code>
                  <span className="text-sm">{bale.weight} kg</span>
                  <span className="text-sm text-muted-foreground">Grade {bale.grade}</span>
                  {bale.ginnery && <span className="text-xs text-muted-foreground">{bale.ginnery}</span>}
                </label>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBalesOpen(false)}>Cancel</Button>
            <Button onClick={handleAddBales} disabled={saving || selectedBaleIds.length === 0}>
              {saving ? "Adding..." : `Add ${selectedBaleIds.length} Bale(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
