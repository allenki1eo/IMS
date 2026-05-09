"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TestResult {
  id: string;
  parameter: {
    id: string;
    name: string;
    unit?: string | null;
    minValue?: number | null;
    maxValue?: number | null;
    targetValue?: number | null;
  };
  actualValue?: number | null;
  textResult?: string | null;
  passed?: boolean | null;
}

interface NcrSummary {
  id: string;
  reference: string;
  title: string;
  severity: string;
  status: string;
}

interface LabTest {
  id: string;
  reference: string;
  testType: string;
  status: string;
  overallResult?: string | null;
  item?: { id: string; name: string } | null;
  standard?: { id: string; name: string; code: string } | null;
  batchNumber?: string | null;
  sampleQty?: number | null;
  sampleUnit?: string | null;
  notes?: string | null;
  testedAt?: string | null;
  createdAt: string;
  results: TestResult[];
  ncrs?: NcrSummary[];
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
    INCOMING: "bg-blue-100 text-blue-700",
    IN_PROCESS: "bg-purple-100 text-purple-700",
    FINAL: "bg-green-100 text-green-700",
    PERIODIC: "bg-gray-100 text-gray-600",
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

function passFailBadge(passed: boolean | null | undefined) {
  if (passed === null || passed === undefined) return <span className="text-muted-foreground text-xs">—</span>;
  return passed ? (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700">Pass</span>
  ) : (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">Fail</span>
  );
}

export default function QcTestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<LabTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [resultEdits, setResultEdits] = useState<Record<string, { actualValue: string; textResult: string }>>({});
  const [savingResults, setSavingResults] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`/api/qc/tests/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const t: LabTest = d.data;
        setTest(t);
        // Initialize edits from current values
        const edits: Record<string, { actualValue: string; textResult: string }> = {};
        (t.results ?? []).forEach((r) => {
          edits[r.id] = {
            actualValue: r.actualValue != null ? String(r.actualValue) : "",
            textResult: r.textResult ?? "",
          };
        });
        setResultEdits(edits);
      })
      .catch(() => toast.error("Failed to load test"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAction(action: "start" | "complete" | "cancel") {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/qc/tests/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? `Failed to ${action} test`); return; }
      toast.success(`Test ${action === "start" ? "started" : action === "complete" ? "completed" : "cancelled"}`);
      loadData();
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveResults() {
    if (!test) return;
    setSavingResults(true);
    try {
      const results = test.results.map((r) => ({
        resultId: r.id,
        actualValue: resultEdits[r.id]?.actualValue ? parseFloat(resultEdits[r.id].actualValue) : undefined,
        textResult: resultEdits[r.id]?.textResult.trim() || undefined,
      }));
      const res = await fetch(`/api/qc/tests/${id}/results`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to save results"); return; }
      toast.success("Results saved");
      loadData();
    } catch {
      toast.error("Network error");
    } finally {
      setSavingResults(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!test) return <div className="text-muted-foreground">Test not found.</div>;

  const isInProgress = test.status === "IN_PROGRESS";
  const hasResults = test.status === "IN_PROGRESS" || test.status === "COMPLETED";

  return (
    <div>
      <PageHeader
        title={test.reference}
        description={`Lab Test — ${test.testType.replace(/_/g, " ")}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/qc/tests">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      {/* Header card */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Test Info</CardTitle>
          <div className="flex items-center gap-2">
            {testTypeBadge(test.testType)}
            <StatusBadge status={test.status} />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Item</p>
            <p className="font-medium mt-1">{test.item?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Standard</p>
            <p className="mt-1">
              {test.standard ? (
                <Link href={`/qc/standards/${test.standard.id}`} className="hover:underline text-primary">
                  {test.standard.code} — {test.standard.name}
                </Link>
              ) : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Batch Number</p>
            <p className="mt-1">{test.batchNumber ?? "—"}</p>
          </div>
          {(test.sampleQty != null || test.sampleUnit) && (
            <div>
              <p className="text-muted-foreground">Sample</p>
              <p className="mt-1">
                {test.sampleQty != null ? test.sampleQty.toLocaleString() : ""}
                {test.sampleUnit ? ` ${test.sampleUnit}` : ""}
              </p>
            </div>
          )}
          {test.testedAt && (
            <div>
              <p className="text-muted-foreground">Tested At</p>
              <p className="mt-1">{format(new Date(test.testedAt), "dd MMM yyyy HH:mm")}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="mt-1">{format(new Date(test.createdAt), "dd MMM yyyy")}</p>
          </div>
          {test.notes && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-muted-foreground">Notes</p>
              <p className="mt-1">{test.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <PermissionGuard require="qc:test:update">
        <div className="flex gap-2 mb-6">
          {test.status === "PENDING" && (
            <Button onClick={() => handleAction("start")} disabled={actionLoading}>
              {actionLoading && <LoadingSpinner className="mr-2" />}
              Start Test
            </Button>
          )}
          {test.status === "IN_PROGRESS" && (
            <>
              <Button onClick={() => handleAction("complete")} disabled={actionLoading}>
                {actionLoading && <LoadingSpinner className="mr-2" />}
                Complete
              </Button>
              <Button variant="destructive" onClick={() => handleAction("cancel")} disabled={actionLoading}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </PermissionGuard>

      {/* Results */}
      {hasResults && test.results.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Test Results</CardTitle>
            {isInProgress && (
              <PermissionGuard require="qc:test:update">
                <Button size="sm" onClick={handleSaveResults} disabled={savingResults}>
                  {savingResults && <LoadingSpinner className="mr-2" />}
                  Save Results
                </Button>
              </PermissionGuard>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Parameter</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Min</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Target</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Max</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actual Value</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Text Result</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pass / Fail</th>
                  </tr>
                </thead>
                <tbody>
                  {test.results.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{r.parameter.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.parameter.unit ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.parameter.minValue ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.parameter.targetValue ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.parameter.maxValue ?? "—"}</td>
                      <td className="px-4 py-3">
                        {isInProgress ? (
                          <Input
                            type="number"
                            step="any"
                            className="h-7 w-24"
                            value={resultEdits[r.id]?.actualValue ?? ""}
                            onChange={(e) =>
                              setResultEdits((prev) => ({
                                ...prev,
                                [r.id]: { ...prev[r.id], actualValue: e.target.value },
                              }))
                            }
                          />
                        ) : (
                          <span>{r.actualValue ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isInProgress ? (
                          <Input
                            type="text"
                            className="h-7 w-32"
                            value={resultEdits[r.id]?.textResult ?? ""}
                            onChange={(e) =>
                              setResultEdits((prev) => ({
                                ...prev,
                                [r.id]: { ...prev[r.id], textResult: e.target.value },
                              }))
                            }
                          />
                        ) : (
                          <span className="text-muted-foreground">{r.textResult ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{passFailBadge(r.passed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Result */}
      {test.status === "COMPLETED" && test.overallResult && (
        <Card className="mb-6">
          <CardContent className="pt-6 flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Overall Result:</span>
            <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold ${
              test.overallResult === "PASS"
                ? "bg-green-100 text-green-700"
                : test.overallResult === "FAIL"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {test.overallResult}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Linked NCRs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Linked NCRs ({(test.ncrs ?? []).length})</CardTitle>
          <PermissionGuard require="qc:ncr:create">
            <Button size="sm" asChild>
              <Link href={`/qc/ncr/new?testId=${test.id}`}>
                <Plus className="h-4 w-4 mr-1" />
                Create NCR
              </Link>
            </Button>
          </PermissionGuard>
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
                </tr>
              </thead>
              <tbody>
                {(test.ncrs ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No NCRs linked to this test
                    </td>
                  </tr>
                ) : (
                  (test.ncrs ?? []).map((ncr) => (
                    <tr key={ncr.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/qc/ncr/${ncr.id}`} className="font-medium hover:underline">
                          {ncr.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{ncr.title}</td>
                      <td className="px-4 py-3">{severityBadge(ncr.severity)}</td>
                      <td className="px-4 py-3"><StatusBadge status={ncr.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
