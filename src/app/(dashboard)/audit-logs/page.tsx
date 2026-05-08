"use client";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseJsonSafe } from "@/lib/utils";
import { toast } from "sonner";

const MODULES = ["all", "auth", "users", "roles", "company", "employees", "settings", "approvals"];
const ACTIONS = ["all", "LOGIN", "LOGOUT", "USER_CREATE", "USER_UPDATE", "USER_DEACTIVATE", "ROLE_CREATE", "ROLE_UPDATE", "BRANCH_CREATE", "DEPT_CREATE", "EMP_CREATE", "SETTING_UPDATE", "WORKFLOW_CREATE", "REQUEST_APPROVED", "REQUEST_REJECTED"];

interface AuditLog {
  id: string;
  userName: string;
  action: string;
  module: string;
  resource: string;
  description: string | null;
  recordId: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("all");
  const [action, setAction] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "30" });
    if (module !== "all") params.set("module", module);
    if (action !== "all") params.set("action", action);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());

    try {
      const res = await fetch(`/api/audit-logs?${params}`);
      const json = await res.json();
      setLogs(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch { toast.error("Failed to load audit logs"); }
    finally { setLoading(false); }
  }, [page, module, action, from, to]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const columns = [
    {
      key: "createdAt",
      header: "Time",
      cell: (row: AuditLog) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {format(new Date(row.createdAt), "dd MMM HH:mm:ss")}
        </span>
      ),
    },
    {
      key: "userName",
      header: "User",
      cell: (row: AuditLog) => <span className="font-medium text-sm">{row.userName}</span>,
    },
    {
      key: "action",
      header: "Action",
      cell: (row: AuditLog) => <Badge variant="outline" className="text-xs font-mono">{row.action}</Badge>,
    },
    {
      key: "module",
      header: "Module",
      cell: (row: AuditLog) => <span className="text-sm capitalize">{row.module}</span>,
    },
    {
      key: "description",
      header: "Description",
      cell: (row: AuditLog) => (
        <div>
          <span className="text-sm">{row.description ?? `${row.resource} ${row.action}`}</span>
          {(row.oldValue || row.newValue) && (
            <button
              className="ml-2 text-xs text-primary hover:underline"
              onClick={() => setExpanded(expanded === row.id ? null : row.id)}
            >
              {expanded === row.id ? "hide" : "details"}
            </button>
          )}
          {expanded === row.id && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {row.oldValue && (
                <div>
                  <div className="font-semibold text-red-600 mb-1">Before</div>
                  <pre className="bg-red-50 p-2 rounded overflow-auto max-h-32 text-red-800">
                    {JSON.stringify(parseJsonSafe(row.oldValue), null, 2)}
                  </pre>
                </div>
              )}
              {row.newValue && (
                <div>
                  <div className="font-semibold text-green-600 mb-1">After</div>
                  <pre className="bg-green-50 p-2 rounded overflow-auto max-h-32 text-green-800">
                    {JSON.stringify(parseJsonSafe(row.newValue), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "ipAddress",
      header: "IP",
      cell: (row: AuditLog) => <span className="text-xs text-muted-foreground">{row.ipAddress ?? "—"}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" description="Complete record of all system actions" />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="w-44">
          <Select value={module} onValueChange={(v) => { setModule(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="All modules" />
            </SelectTrigger>
            <SelectContent>
              {MODULES.map((m) => <SelectItem key={m} value={m}>{m === "all" ? "All modules" : m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a === "all" ? "All actions" : a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">From</Label>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="h-10 w-36" />
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">To</Label>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="h-10 w-36" />
        </div>
        <Button variant="outline" onClick={() => { setModule("all"); setAction("all"); setFrom(""); setTo(""); setPage(1); }}>
          Reset
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        page={page}
        pageSize={30}
        total={total}
        onPageChange={setPage}
        emptyTitle="No audit logs"
        emptyDescription="No actions have been recorded yet."
      />
    </div>
  );
}
