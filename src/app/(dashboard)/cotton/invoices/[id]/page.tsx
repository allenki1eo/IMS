"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Bale {
  id: string;
  baleNumber: string;
  weight: number;
  grade: string;
}

interface Lot {
  id: string;
  lotNumber: string;
  totalWeight: number;
  baleCount: number;
  bales: Bale[];
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
  totalWeight: number;
  pricePerKg: number;
  currency: string;
  totalAmount: number;
  issuedAt?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  createdAt: string;
  contract: {
    id: string;
    contractNumber: string;
    buyer: {
      id: string;
      name: string;
      contactName?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      country?: string | null;
    };
    lines: ContractLine[];
  };
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  function loadInvoice() {
    setLoading(true);
    fetch(`/api/cotton/invoices/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setInvoice(d.data);
        else toast.error("Invoice not found");
      })
      .catch(() => toast.error("Failed to load invoice"))
      .finally(() => setLoading(false));
  }

  useEffect(loadInvoice, [id]);

  async function handleMarkPaid() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/cotton/invoices/${id}/pay`, { method: "POST" });
      const d = await res.json();
      if (d.success) {
        toast.success("Invoice marked as paid");
        loadInvoice();
      } else {
        toast.error(d.error ?? "Failed to mark invoice as paid");
      }
    } catch {
      toast.error("Failed to mark invoice as paid");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!invoice) return <div className="p-4">Invoice not found.</div>;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="no-print">
        <PageHeader
          title={invoice.invoiceNumber}
          description={`Cotton Sales Invoice · ${invoice.contract.buyer.name}`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/cotton/invoices"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print Invoice
              </Button>
              {(invoice.status === "DRAFT" || invoice.status === "ISSUED") && (
                <PermissionGuard require="cotton:invoice:update">
                  <Button onClick={handleMarkPaid} disabled={actionLoading}>
                    Mark as Paid
                  </Button>
                </PermissionGuard>
              )}
            </div>
          }
        />
      </div>

      {/* Invoice document */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">TAX INVOICE</h1>
              <p className="text-muted-foreground mt-1">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <div className="no-print mb-2">
                <StatusBadge status={invoice.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Date: {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
              {invoice.dueDate && (
                <p className="text-sm text-muted-foreground">
                  Due: {new Date(invoice.dueDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-2">Bill To</h3>
              <p className="font-bold">{invoice.contract.buyer.name}</p>
              {invoice.contract.buyer.contactName && (
                <p className="text-sm">{invoice.contract.buyer.contactName}</p>
              )}
              {invoice.contract.buyer.address && (
                <p className="text-sm text-muted-foreground">{invoice.contract.buyer.address}</p>
              )}
              {invoice.contract.buyer.country && (
                <p className="text-sm text-muted-foreground">{invoice.contract.buyer.country}</p>
              )}
              {invoice.contract.buyer.email && (
                <p className="text-sm text-muted-foreground">{invoice.contract.buyer.email}</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-2">Contract Reference</h3>
              <p className="text-sm font-medium">{invoice.contract.contractNumber}</p>
              <p className="text-sm text-muted-foreground">Price: ${invoice.pricePerKg}/kg</p>
            </div>
          </div>

          {/* Lots table */}
          <div className="mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 pr-4 font-semibold">Lot Number</th>
                  <th className="text-right py-3 pr-4 font-semibold">Bales</th>
                  <th className="text-right py-3 pr-4 font-semibold">Net Weight (kg)</th>
                  <th className="text-right py-3 pr-4 font-semibold">Unit Price ($/kg)</th>
                  <th className="text-right py-3 font-semibold">Amount (USD)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.contract.lines.map((line) => (
                  <tr key={line.id} className="border-b border-gray-100">
                    <td className="py-2.5 pr-4 font-mono text-xs">{line.lot.lotNumber}</td>
                    <td className="py-2.5 pr-4 text-right">{line.lot.baleCount}</td>
                    <td className="py-2.5 pr-4 text-right">{line.weight.toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                    <td className="py-2.5 pr-4 text-right">{invoice.pricePerKg.toFixed(4)}</td>
                    <td className="py-2.5 text-right">{line.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-semibold">
                  <td className="py-3 pr-4">TOTAL</td>
                  <td className="py-3 pr-4 text-right">
                    {invoice.contract.lines.reduce((s, l) => s + l.lot.baleCount, 0)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {invoice.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </td>
                  <td className="py-3 pr-4"></td>
                  <td className="py-3 text-right text-base">
                    USD {invoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-semibold">Notes</p>
              <p className="text-sm text-muted-foreground mt-1">{invoice.notes}</p>
            </div>
          )}

          <div className="border-t pt-4 mt-4 text-xs text-muted-foreground">
            <p>Payment due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "Upon receipt"}</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
