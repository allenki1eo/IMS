"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Contract {
  id: string;
  contractNumber: string;
  status: string;
  pricePerKg: number;
  totalWeight: number;
  totalAmount: number;
  contractDate: string;
}

interface Buyer {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  taxNumber?: string | null;
  contracts: Contract[];
}

export default function BuyerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/cotton/buyers/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setBuyer(d.data);
        else toast.error("Buyer not found");
      })
      .catch(() => toast.error("Failed to load buyer"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState />;
  if (!buyer) return <div className="p-4">Buyer not found.</div>;

  return (
    <div>
      <PageHeader
        title={buyer.name}
        description={buyer.country ?? "Cotton buyer"}
        actions={
          <Button variant="outline" asChild>
            <Link href="/cotton/buyers"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Contact Details</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            {buyer.contactName && (
              <div><span className="text-muted-foreground">Contact: </span>{buyer.contactName}</div>
            )}
            {buyer.email && (
              <div><span className="text-muted-foreground">Email: </span>{buyer.email}</div>
            )}
            {buyer.phone && (
              <div><span className="text-muted-foreground">Phone: </span>{buyer.phone}</div>
            )}
            {buyer.address && (
              <div><span className="text-muted-foreground">Address: </span>{buyer.address}</div>
            )}
            {buyer.country && (
              <div><span className="text-muted-foreground">Country: </span>{buyer.country}</div>
            )}
            {buyer.taxNumber && (
              <div><span className="text-muted-foreground">Tax #: </span>{buyer.taxNumber}</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Contract History</CardTitle>
              <Button size="sm" asChild>
                <Link href={`/cotton/contracts/new`}>New Contract</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {buyer.contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No contracts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Contract #</th>
                      <th className="text-right py-2 pr-4 font-medium">Weight (kg)</th>
                      <th className="text-right py-2 pr-4 font-medium">Amount (USD)</th>
                      <th className="text-left py-2 pr-4 font-medium">Date</th>
                      <th className="text-left py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyer.contracts.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <Link href={`/cotton/contracts/${c.id}`} className="font-medium hover:underline text-primary">
                            {c.contractNumber}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 text-right">{c.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                        <td className="py-2 pr-4 text-right">${c.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{new Date(c.contractDate).toLocaleDateString()}</td>
                        <td className="py-2"><StatusBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
