"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Plus,
  Eye,
  EyeOff,
  Key,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/hooks/useCurrency";
import { usePermission } from "@/hooks/usePermission";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SyncLog {
  id: string;
  syncedAt: string;
  status: string;
  vouchersIn: number;
  ledgersIn: number;
  errorMsg?: string;
  triggeredBy: string;
}

interface TallyVoucher {
  id: string;
  tallyId: string;
  voucherType: string;
  voucherNumber: string;
  date: string;
  narration?: string;
  amount: number;
  currency: string;
  partyName?: string;
}

interface TallyLedger {
  id: string;
  name: string;
  group?: string;
  openingBal: number;
  closingBal: number;
  currency: string;
  syncedAt: string;
}

interface ApiKey {
  id: string;
  label: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleString();
}

function fmtAmt(n: number, currency: string) {
  return n.toLocaleString("en-TZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

function SyncStatusBadge({ status }: { status: string }) {
  if (status === "SUCCESS")
    return (
      <Badge variant="success" className="flex items-center gap-1 w-fit">
        <CheckCircle className="h-3 w-3" /> Success
      </Badge>
    );
  if (status === "PARTIAL")
    return (
      <Badge variant="warning" className="flex items-center gap-1 w-fit">
        <AlertCircle className="h-3 w-3" /> Partial
      </Badge>
    );
  return (
    <Badge variant="destructive" className="flex items-center gap-1 w-fit">
      <XCircle className="h-3 w-3" /> Failed
    </Badge>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  syncLogs,
  voucherCount,
  ledgerCount,
  companyId,
}: {
  syncLogs: SyncLog[];
  voucherCount: number;
  ledgerCount: number;
  companyId: string;
}) {
  const lastSync = syncLogs[0];

  const agentConfig = JSON.stringify(
    {
      tallyUrl: "http://localhost:9000",
      imsUrl: typeof window !== "undefined" ? window.location.origin : "https://your-ims-app.com",
      apiKey: "YOUR_API_KEY_FROM_IMS",
      companyId,
      syncIntervalDays: 7,
    },
    null,
    2
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last Sync</CardDescription>
            <CardTitle className="text-base">
              {lastSync ? fmtDate(lastSync.syncedAt) : "Never"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastSync ? (
              <SyncStatusBadge status={lastSync.status} />
            ) : (
              <Badge variant="outline">No syncs yet</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Vouchers</CardDescription>
            <CardTitle className="text-2xl">{voucherCount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Synced from Tally</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Ledgers</CardDescription>
            <CardTitle className="text-2xl">{ledgerCount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Synced from Tally</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" /> How the Sync Agent Works
          </CardTitle>
          <CardDescription>
            The Tally sync agent is a standalone Node.js script that runs on the same machine as
            Tally. It reads vouchers and ledger balances from Tally&apos;s XML API (port 9000) and
            sends them to IMS via a secure API key. Set it up as a cron job or Windows Task
            Scheduler task to run on a schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Agent config.json template:</p>
            <div className="relative">
              <pre className="bg-muted rounded-md p-4 text-xs overflow-auto whitespace-pre">
                {agentConfig}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  navigator.clipboard.writeText(agentConfig);
                  toast.success("Config copied to clipboard");
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate an API key in the <strong>API Keys</strong> tab, replace{" "}
            <code className="text-xs bg-muted px-1 rounded">YOUR_API_KEY_FROM_IMS</code> in the
            config, and replace <code className="text-xs bg-muted px-1 rounded">YOUR_COMPANY_ID</code>{" "}
            with the company ID shown above. Then run:{" "}
            <code className="text-xs bg-muted px-1 rounded">node index.js</code> from the agent
            directory.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Vouchers Tab ──────────────────────────────────────────────────────────────

function VouchersTab({ currency }: { currency: string }) {
  const [vouchers, setVouchers] = useState<TallyVoucher[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [voucherType, setVoucherType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 20;

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (voucherType) params.set("voucherType", voucherType);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (search) params.set("search", search);
    const res = await fetch(`/api/tally/vouchers?${params}`);
    if (res.ok) {
      const d = await res.json();
      setVouchers(d.data ?? []);
      setTotal(d.meta?.total ?? 0);
    }
    setLoading(false);
  }, [page, voucherType, from, to, search]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const columns = [
    {
      key: "date",
      header: "Date",
      cell: (row: TallyVoucher) => new Date(row.date).toLocaleDateString(),
    },
    {
      key: "voucherType",
      header: "Type",
      cell: (row: TallyVoucher) => (
        <Badge variant="outline">{row.voucherType}</Badge>
      ),
    },
    { key: "voucherNumber", header: "Number", cell: (row: TallyVoucher) => row.voucherNumber },
    { key: "partyName", header: "Party", cell: (row: TallyVoucher) => row.partyName ?? "—" },
    {
      key: "narration",
      header: "Narration",
      cell: (row: TallyVoucher) => (
        <span className="max-w-[200px] truncate block" title={row.narration ?? ""}>
          {row.narration ?? "—"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (row: TallyVoucher) => fmtAmt(row.amount, row.currency || currency),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={voucherType}
          onChange={(e) => { setVoucherType(e.target.value); setPage(1); }}
          className="border rounded px-2 py-1 text-sm bg-background"
        >
          <option value="">All Types</option>
          <option value="Journal">Journal</option>
          <option value="Payment">Payment</option>
          <option value="Receipt">Receipt</option>
          <option value="Purchase">Purchase</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className="border rounded px-2 py-1 text-sm bg-background"
          placeholder="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className="border rounded px-2 py-1 text-sm bg-background"
          placeholder="To date"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border rounded px-2 py-1 text-sm bg-background"
          placeholder="Search voucher/party/narration..."
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : vouchers.length === 0 ? (
        <EmptyState
          title="No vouchers found"
          description="No Tally vouchers have been synced yet. Configure the sync agent to import data."
        />
      ) : (
        <>
          <DataTable columns={columns} data={vouchers} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * PAGE_SIZE >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Ledgers Tab ───────────────────────────────────────────────────────────────

function LedgersTab({ currency }: { currency: string }) {
  const [ledgers, setLedgers] = useState<TallyLedger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tally/ledgers")
      .then((r) => r.json())
      .then((d) => setLedgers(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const totalAssets = ledgers
    .filter((l) => l.group?.toLowerCase().includes("asset"))
    .reduce((sum, l) => sum + l.closingBal, 0);
  const totalLiabilities = ledgers
    .filter((l) => l.group?.toLowerCase().includes("liabilit"))
    .reduce((sum, l) => sum + l.closingBal, 0);

  const columns = [
    { key: "name", header: "Ledger Name", cell: (row: TallyLedger) => row.name },
    { key: "group", header: "Group", cell: (row: TallyLedger) => row.group ?? "—" },
    {
      key: "openingBal",
      header: "Opening Balance",
      cell: (row: TallyLedger) => fmtAmt(row.openingBal, row.currency || currency),
    },
    {
      key: "closingBal",
      header: "Closing Balance",
      cell: (row: TallyLedger) => fmtAmt(row.closingBal, row.currency || currency),
    },
    {
      key: "syncedAt",
      header: "Last Synced",
      cell: (row: TallyLedger) => new Date(row.syncedAt).toLocaleDateString(),
    },
  ];

  if (loading) return <LoadingState />;
  if (ledgers.length === 0)
    return (
      <EmptyState
        title="No ledgers found"
        description="No Tally ledgers have been synced yet."
      />
    );

  return (
    <div className="space-y-4">
      {(totalAssets > 0 || totalLiabilities > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Assets</CardDescription>
              <CardTitle className="text-xl">{fmtAmt(totalAssets, currency)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Liabilities</CardDescription>
              <CardTitle className="text-xl">{fmtAmt(totalLiabilities, currency)}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}
      <DataTable columns={columns} data={ledgers} />
    </div>
  );
}

// ─── Sync Logs Tab ─────────────────────────────────────────────────────────────

function SyncLogsTab() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tally/sync-logs")
      .then((r) => r.json())
      .then((d) => setLogs(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: "syncedAt",
      header: "Date / Time",
      cell: (row: SyncLog) => fmtDate(row.syncedAt),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: SyncLog) => <SyncStatusBadge status={row.status} />,
    },
    {
      key: "vouchersIn",
      header: "Vouchers",
      cell: (row: SyncLog) => row.vouchersIn.toLocaleString(),
    },
    {
      key: "ledgersIn",
      header: "Ledgers",
      cell: (row: SyncLog) => row.ledgersIn.toLocaleString(),
    },
    {
      key: "triggeredBy",
      header: "Triggered By",
      cell: (row: SyncLog) => (
        <Badge variant="outline">{row.triggeredBy}</Badge>
      ),
    },
    {
      key: "errorMsg",
      header: "Error",
      cell: (row: SyncLog) =>
        row.errorMsg ? (
          <span className="text-destructive text-xs truncate max-w-[200px] block" title={row.errorMsg}>
            {row.errorMsg}
          </span>
        ) : (
          "—"
        ),
    },
  ];

  if (loading) return <LoadingState />;
  if (logs.length === 0)
    return (
      <EmptyState
        title="No sync logs"
        description="Sync logs will appear here once the agent has run."
      />
    );

  return <DataTable columns={columns} data={logs} />;
}

// ─── API Keys Tab ──────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const canManage = usePermission("finance:tally:manage");

  const fetchKeys = useCallback(() => {
    setLoading(true);
    fetch("/api/tally/api-keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleCreate() {
    if (!newLabel.trim()) return;
    setCreating(true);
    const res = await fetch("/api/tally/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim() }),
    });
    const d = await res.json();
    if (res.ok) {
      setGeneratedKey(d.data?.plainKey ?? null);
      setNewLabel("");
      fetchKeys();
    } else {
      toast.error(d.error ?? "Failed to generate API key");
    }
    setCreating(false);
  }

  const columns = [
    { key: "label", header: "Label", cell: (row: ApiKey) => row.label },
    {
      key: "isActive",
      header: "Status",
      cell: (row: ApiKey) => (
        <Badge variant={row.isActive ? "success" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "lastUsedAt",
      header: "Last Used",
      cell: (row: ApiKey) => (row.lastUsedAt ? fmtDate(row.lastUsedAt) : "Never"),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row: ApiKey) => fmtDate(row.createdAt),
    },
  ];

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Generate API Key
          </Button>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : keys.length === 0 ? (
        <EmptyState
          title="No API keys"
          description="Generate an API key to allow the sync agent to connect."
        />
      ) : (
        <DataTable columns={columns} data={keys} />
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setGeneratedKey(null); setShowKey(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" /> Generate API Key
            </DialogTitle>
          </DialogHeader>

          {generatedKey ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Copy this key now. It will <strong>not be shown again</strong>.
              </p>
              <div className="relative">
                <div className="border rounded-md p-3 font-mono text-sm break-all bg-muted pr-16">
                  {showKey ? generatedKey : "•".repeat(Math.min(generatedKey.length, 48))}
                </div>
                <div className="absolute right-2 top-2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKey((v) => !v)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedKey);
                      toast.success("API key copied");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setCreateOpen(false); setGeneratedKey(null); setShowKey(false); }}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="key-label">Label</Label>
                <Input
                  id="key-label"
                  placeholder="e.g. Tally Sync Agent - Server 1"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating || !newLabel.trim()}>
                  {creating ? "Generating..." : "Generate"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TallyPage() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [voucherCount, setVoucherCount] = useState(0);
  const [ledgerCount, setLedgerCount] = useState(0);
  const [companyId, setCompanyId] = useState("");
  const currency = useCurrency();

  useEffect(() => {
    // Fetch sync logs for overview
    fetch("/api/tally/sync-logs")
      .then((r) => r.json())
      .then((d) => setSyncLogs(d.data ?? []));

    // Fetch voucher count
    fetch("/api/tally/vouchers?page=1&pageSize=1")
      .then((r) => r.json())
      .then((d) => setVoucherCount(d.meta?.total ?? 0));

    // Fetch ledger count
    fetch("/api/tally/ledgers")
      .then((r) => r.json())
      .then((d) => setLedgerCount((d.data ?? []).length));

    // Get company id from the settings/company API
    fetch("/api/company")
      .then((r) => r.json())
      .then((d) => setCompanyId(d.data?.id ?? ""));
  }, []);

  return (
    <PermissionGuard require="finance:tally:read">
      <div className="space-y-6">
        <PageHeader
          title="Tally Sync"
          description="One-way synchronization of vouchers and ledgers from Tally accounting software."
        />

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
            <TabsTrigger value="ledgers">Ledgers</TabsTrigger>
            <TabsTrigger value="sync-logs">Sync Logs</TabsTrigger>
            <PermissionGuard require="finance:tally:manage">
              <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            </PermissionGuard>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <OverviewTab
              syncLogs={syncLogs}
              voucherCount={voucherCount}
              ledgerCount={ledgerCount}
              companyId={companyId}
            />
          </TabsContent>

          <TabsContent value="vouchers" className="mt-4">
            <VouchersTab currency={currency} />
          </TabsContent>

          <TabsContent value="ledgers" className="mt-4">
            <LedgersTab currency={currency} />
          </TabsContent>

          <TabsContent value="sync-logs" className="mt-4">
            <SyncLogsTab />
          </TabsContent>

          <TabsContent value="api-keys" className="mt-4">
            <ApiKeysTab />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
