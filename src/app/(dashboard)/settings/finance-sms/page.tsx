"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, MessageSquare, RefreshCw } from "lucide-react";

type Recipient = {
  id?: string;
  phone: string;
  label?: string | null;
  isActive?: boolean;
};

type SettingBundle = {
  enabled: boolean;
  skipIfZero?: boolean;
  recipients: Recipient[];
};

type SettingsResponse = {
  deposit: SettingBundle;
  eod: SettingBundle;
};

type SmsLog = {
  id: string;
  alertType: string;
  sourceType: string;
  sourceId: string;
  companyId: string | null;
  phone: string;
  body: string;
  status: string;
  providerMsgId: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export default function FinanceSmsSettingsPage() {
  return (
    <PermissionGuard require="settings:settings:read">
      <FinanceSmsSettingsInner />
    </PermissionGuard>
  );
}

function FinanceSmsSettingsInner() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositRecipients, setDepositRecipients] = useState<Recipient[]>([{ phone: "", label: "Director" }]);
  const [eodEnabled, setEodEnabled] = useState(false);
  const [eodSkipIfZero, setEodSkipIfZero] = useState(true);
  const [eodRecipients, setEodRecipients] = useState<Recipient[]>([{ phone: "", label: "Director" }]);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/sms-settings");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
      const data = json.data as SettingsResponse;
      setDepositEnabled(Boolean(data.deposit?.enabled));
      setDepositRecipients(
        data.deposit?.recipients?.length
          ? data.deposit.recipients.map((r) => ({
              phone: r.phone,
              label: r.label ?? "",
              isActive: r.isActive !== false,
            }))
          : [{ phone: "", label: "Director" }]
      );
      setEodEnabled(Boolean(data.eod?.enabled));
      setEodSkipIfZero(data.eod?.skipIfZero !== false);
      setEodRecipients(
        data.eod?.recipients?.length
          ? data.eod.recipients.map((r) => ({
              phone: r.phone,
              label: r.label ?? "",
              isActive: r.isActive !== false,
            }))
          : [{ phone: "", label: "Director" }]
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load SMS settings");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/finance/sms-logs?pageSize=30");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load logs");
      setLogs(json.data?.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load SMS logs");
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadLogs();
  }, [load, loadLogs]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/finance/sms-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deposit: {
            enabled: depositEnabled,
            recipients: depositRecipients.filter((r) => r.phone.trim()),
          },
          eod: {
            enabled: eodEnabled,
            skipIfZero: eodSkipIfZero,
            recipients: eodRecipients.filter((r) => r.phone.trim()),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      toast.success("Finance SMS settings saved");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState text="Loading finance SMS settings…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance SMS alerts"
        description="Deposit alerts (per company) and one combined end-of-day spend rollup for all companies. Provider: Swala SMS."
        actions={
          <PermissionGuard require="settings:settings:update" fallback={null}>
            <Button onClick={() => void save()} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </PermissionGuard>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Deposit SMS (this company)
          </CardTitle>
          <CardDescription>
            Sent when a cashbook RECEIPT or bank DEPOSIT is posted. Times are Africa/Dar_es_Salaam (EAT).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Enable deposit alerts</Label>
              <p className="text-sm text-muted-foreground">Notify the phones below on money-in events</p>
            </div>
            <Switch checked={depositEnabled} onCheckedChange={setDepositEnabled} />
          </div>
          <RecipientEditor
            recipients={depositRecipients}
            onChange={setDepositRecipients}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>End-of-day spend SMS (all companies)</CardTitle>
          <CardDescription>
            One combined rollup to the director list. Outflows = cashbook PAYMENT + bank WITHDRAWAL (excludes transfers). Cron ~18:00–20:00 EAT.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Enable EOD spend SMS</Label>
              <p className="text-sm text-muted-foreground">Global — not per company</p>
            </div>
            <Switch checked={eodEnabled} onCheckedChange={setEodEnabled} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Skip if zero spend</Label>
              <p className="text-sm text-muted-foreground">Default on — saves SMS cost when nothing was spent</p>
            </div>
            <Switch checked={eodSkipIfZero} onCheckedChange={setEodSkipIfZero} />
          </div>
          <RecipientEditor
            recipients={eodRecipients}
            onChange={setEodRecipients}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent SMS audit</CardTitle>
            <CardDescription>Sent / failed / skipped — includes provider message id when available</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadLogs()} disabled={logsLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${logsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No SMS logs yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={log.status === "SENT" ? "default" : log.status === "FAILED" ? "destructive" : "secondary"}>
                      {log.status}
                    </Badge>
                    <span className="font-medium">{log.alertType}</span>
                    <span className="text-muted-foreground">{log.phone}</span>
                    <span className="text-muted-foreground ml-auto">
                      {new Date(log.createdAt).toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam" })} EAT
                    </span>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{log.body}</pre>
                  {log.errorMessage && (
                    <p className="mt-1 text-xs text-destructive">{log.errorMessage}</p>
                  )}
                  {log.providerMsgId && (
                    <p className="mt-1 text-xs text-muted-foreground">Provider id: {log.providerMsgId}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RecipientEditor({
  recipients,
  onChange,
}: {
  recipients: Recipient[];
  onChange: (next: Recipient[]) => void;
}) {
  return (
    <div className="space-y-3">
      <Label>Recipients</Label>
      {recipients.map((r, idx) => (
        <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Phone (E.164 or 07…)</Label>
            <Input
              value={r.phone}
              placeholder="+255712345678"
              onChange={(e) => {
                const next = [...recipients];
                next[idx] = { ...next[idx], phone: e.target.value };
                onChange(next);
              }}
            />
          </div>
          <div className="w-full sm:w-40 space-y-1">
            <Label className="text-xs text-muted-foreground">Role label</Label>
            <Input
              value={r.label ?? ""}
              placeholder="Director"
              onChange={(e) => {
                const next = [...recipients];
                next[idx] = { ...next[idx], label: e.target.value };
                onChange(next);
              }}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(recipients.filter((_, i) => i !== idx))}
            disabled={recipients.length <= 1}
            aria-label="Remove recipient"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...recipients, { phone: "", label: "" }])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add phone
      </Button>
    </div>
  );
}
