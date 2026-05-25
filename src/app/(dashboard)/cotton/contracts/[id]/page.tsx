"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Lot {
  id: string;
  lotNumber: string;
  totalWeight: number;
  baleCount: number;
  season: { name: string };
}

interface ContractLine {
  id: string;
  lotId: string;
  weight: number;
  amount: number;
  lot: Lot;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  issuedAt?: string | null;
}

interface Contract {
  id: string;
  contractNumber: string;
  status: string;
  pricePerKg: number;
  currency: string;
  totalWeight: number;
  totalAmount: number;
  notes?: string | null;
  contractDate: string;
  buyer: {
    id: string;
    name: string;
    contactName?: string | null;
    email?: string | null;
  };
  lines: ContractLine[];
  invoices: Invoice[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-blue-100 text-blue-800",
  INVOICED: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function ContractDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  function loadContract() {
    setLoading(true);
    fetch(`/api/cotton/contracts/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setContract(d.data);
        else toast.error("Contract not found");
      })
      .catch(() => toast.error("Failed to load contract"))
      .finally(() => setLoading(false));
  }

  useEffect(loadContract, [id]);

  async function handleAction(endpoint: string, label: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/cotton/contracts/${id}/${endpoint}`, { method: "POST" });
      const d = await res.json();
      if (d.success) {
        toast.success(`${label} successful`);
        loadContract();
      } else {
        toast.error(d.error ?? `Failed to ${label.toLowerCase()}`);
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateInvoice() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/cotton/contracts/${id}/invoice`, { method: "POST" });
      const d = await res.json();
      if (d.success) {
        toast.success("Invoice created");
        loadContract();
      } else {
        toast.error(d.error ?? "Failed to create invoice");
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!contract) return <div className="p-4">Contract not found.</div>;

  const activeInvoice = contract.invoices.find((i) => i.status !== "CANCELLED");

  return (
    <div>
      <PageHeader
        title={contract.contractNumber}
        description={`Buyer: ${contract.buyer.name}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/cotton/contracts"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
            </Button>
            {contract.status === "DRAFT" && (
              <Button onClick={() => handleAction("confirm", "Confirm")} disabled={actionLoading}>
                Confirm Contract
              </Button>
            )}
            {contract.status === "CONFIRMED" && !activeInvoice && (
              <Button onClick={handleCreateInvoice} disabled={actionLoading}>
                <FileText className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            )}
            {["DRAFT", "CONFIRMED"].includes(contract.status) && (
              <Button variant="destructive" onClick={() => handleAction("cancel", "Cancel")} disabled={actionLoading}>
                Cancel
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
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-medium ${STATUS_COLORS[contract.status] ?? ""}`}>
              {contract.status}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Price / kg</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">${contract.pricePerKg}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Total Weight</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{contract.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Total Amount</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">${contract.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></CardContent>
        </Card>
      </div>

      {/* Invoice link */}
      {activeInvoice && (
        <Card className="mb-6 border-primary/30">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium">Invoice: {activeInvoice.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">${activeInvoice.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} · <StatusBadge status={activeInvoice.status} /></p>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/cotton/invoices/${activeInvoice.id}`}>View Invoice</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lots table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lots ({contract.lines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Lot #</th>
                  <th className="text-left py-2 pr-4 font-medium">Season</th>
                  <th className="text-right py-2 pr-4 font-medium">Bales</th>
                  <th className="text-right py-2 pr-4 font-medium">Weight (kg)</th>
                  <th className="text-right py-2 font-medium">Amount (USD)</th>
                </tr>
              </thead>
              <tbody>
                {contract.lines.map((line) => (
                  <tr key={line.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <Link href={`/cotton/lots/${line.lot.id}`} className="font-medium hover:underline text-primary">
                        {line.lot.lotNumber}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{line.lot.season.name}</td>
                    <td className="py-2 pr-4 text-right">{line.lot.baleCount}</td>
                    <td className="py-2 pr-4 text-right">{line.weight.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                    <td className="py-2 text-right font-medium">${line.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                <tr className="font-semibold bg-muted/30">
                  <td colSpan={3} className="py-2 pr-4">Total</td>
                  <td className="py-2 pr-4 text-right">{contract.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                  <td className="py-2 text-right">${contract.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {contract.notes && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{contract.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
