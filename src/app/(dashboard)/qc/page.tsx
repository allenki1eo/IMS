"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { FlaskConical, ClipboardCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TestRow {
  id: string;
  reference: string;
  testType: string;
  item?: { name: string } | null;
  standard?: { name: string } | null;
  status: string;
  overallResult?: string | null;
  createdAt: string;
}

interface NcrRow {
  id: string;
  reference: string;
  title: string;
  severity: string;
  status: string;
  createdAt: string;
}

interface Stats {
  totalTests: number;
  pendingActive: number;
  openNcrs: number;
  criticalNcrs: number;
}

function resultBadge(result: string | null | undefined) {
  if (!result) return null;
  const colors: Record<string, string> = {
    PASS: "bg-green-100 text-green-700",
    FAIL: "bg-red-100 text-red-700",
    CONDITIONAL: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colors[result] ?? "bg-gray-100 text-gray-600"}`}>
      {result}
    </span>
  );
}

function testTypeBadge(type: string) {
  const colors: Record<string, string> = {
    RAW_MATERIAL: "bg-amber-100 text-amber-700",
    WATER: "bg-sky-100 text-sky-700",
    WORT: "bg-orange-100 text-orange-700",
    FERMENTATION: "bg-purple-100 text-purple-700",
    BRIGHT_BEER: "bg-green-100 text-green-700",
    PACKAGING: "bg-blue-100 text-blue-700",
    MICROBIOLOGY: "bg-red-100 text-red-700",
    SENSORY: "bg-pink-100 text-pink-700",
    RETAIN_SAMPLE: "bg-slate-100 text-slate-700",
    CALIBRATION: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colors[type] ?? "bg-gray-100 text-gray-600"}`}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

function severityBadge(severity: string) {
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-700",
    MAJOR: "bg-orange-100 text-orange-700",
    MINOR: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colors[severity] ?? "bg-gray-100 text-gray-600"}`}>
      {severity}
    </span>
  );
}

export default function QcOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTests, setRecentTests] = useState<TestRow[]>([]);
  const [criticalNcrs, setCriticalNcrs] = useState<NcrRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/qc/tests?pageSize=5").then((r) => r.json()),
      fetch("/api/qc/tests?status=PENDING&pageSize=200").then((r) => r.json()),
      fetch("/api/qc/tests?status=IN_PROGRESS&pageSize=200").then((r) => r.json()),
      fetch("/api/qc/ncr?status=OPEN&pageSize=200").then((r) => r.json()),
      fetch("/api/qc/ncr?severity=CRITICAL&status=OPEN&pageSize=200").then((r) => r.json()),
    ])
      .then(([recentData, pendingData, inProgressData, openNcrData, criticalNcrData]) => {
        const pending = pendingData.meta?.total ?? 0;
        const inProgress = inProgressData.meta?.total ?? 0;
        setStats({
          totalTests: recentData.meta?.total ?? 0,
          pendingActive: pending + inProgress,
          openNcrs: openNcrData.meta?.total ?? 0,
          criticalNcrs: criticalNcrData.meta?.total ?? 0,
        });
        setRecentTests(recentData.data ?? []);
        setCriticalNcrs(criticalNcrData.data ?? []);
      })
      .catch(() => toast.error("Failed to load QC overview"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Quality Control & Lab"
        description="Overview of lab tests, quality standards, and non-conformances"
      />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FlaskConical className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalTests ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Tests</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats?.pendingActive ?? 0}</p>
              <p className="text-sm text-muted-foreground">Pending / Active</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats?.openNcrs ?? 0}</p>
              <p className="text-sm text-muted-foreground">Open NCRs</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats?.criticalNcrs ?? 0}</p>
              <p className="text-sm text-muted-foreground">Critical NCRs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Lab Tests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Lab Tests</CardTitle>
            <Link href="/qc/tests" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item / Standard</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Result</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No tests found
                      </td>
                    </tr>
                  ) : (
                    recentTests.map((test) => (
                      <tr key={test.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link href={`/qc/tests/${test.id}`} className="font-medium hover:underline">
                            {test.reference}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{testTypeBadge(test.testType)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {test.item?.name ?? test.standard?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={test.status} />
                        </td>
                        <td className="px-4 py-3">{resultBadge(test.overallResult)}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(test.createdAt), "dd MMM yyyy")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Open Critical NCRs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Open Critical NCRs</CardTitle>
            <Link href="/qc/ncr?severity=CRITICAL&status=OPEN" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Severity</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalNcrs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No critical NCRs
                      </td>
                    </tr>
                  ) : (
                    criticalNcrs.map((ncr) => (
                      <tr key={ncr.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link href={`/qc/ncr/${ncr.id}`} className="font-medium hover:underline">
                            {ncr.reference}
                          </Link>
                        </td>
                        <td className="px-4 py-3 max-w-[160px] truncate">{ncr.title}</td>
                        <td className="px-4 py-3">{severityBadge(ncr.severity)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={ncr.status} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(ncr.createdAt), "dd MMM yyyy")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
