"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Tag, Package, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Summary {
  totalReceived: number;
  totalUsed: number;
  totalBalance: number;
  activeBatches: number;
  byType: Record<string, { received: number; used: number; balance: number }>;
}

export default function TraStampsOverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tra-stamps/summary")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSummary(json.data);
        else toast.error("Failed to load TRA stamps summary");
      })
      .catch(() => toast.error("Failed to load TRA stamps summary"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="TRA Stamps"
        description="Tanzania Revenue Authority tax stamp management"
        actions={
          <div className="flex gap-2">
            <PermissionGuard require="tra-stamps:stamp:create">
              <Button asChild>
                <Link href="/tra-stamps/batches/new">Receive Stamps</Link>
              </Button>
            </PermissionGuard>
            <PermissionGuard require="tra-stamps:stamp:activate">
              <Button variant="outline" asChild>
                <Link href="/tra-stamps/activations/new">Record Activation</Link>
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Tag className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold">{(summary?.totalBalance ?? 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Received</p>
              <p className="text-2xl font-bold">{(summary?.totalReceived ?? 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Used</p>
              <p className="text-2xl font-bold">{(summary?.totalUsed ?? 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Batches</p>
              <p className="text-2xl font-bold">{summary?.activeBatches ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Type Table */}
      {summary && Object.keys(summary.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balance by Stamp Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Received</th>
                    <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Used</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.byType).map(([type, stats]) => (
                    <tr key={type} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{type}</td>
                      <td className="py-2 pr-4 text-right">{stats.received.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right">{stats.used.toLocaleString()}</td>
                      <td className={`py-2 text-right font-semibold ${stats.balance > 0 ? "text-green-600" : "text-red-600"}`}>
                        {stats.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="flex gap-3 mt-6">
        <Button variant="outline" asChild>
          <Link href="/tra-stamps/batches">View All Batches</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tra-stamps/activations">View All Activations</Link>
        </Button>
      </div>
    </div>
  );
}
