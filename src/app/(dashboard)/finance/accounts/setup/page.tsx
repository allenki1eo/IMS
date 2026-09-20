"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Landmark,
  Loader2,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/hooks/usePermission";

type Step = 1 | 2 | 3 | 4;

interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  accountCount: number;
  byType: Record<string, number>;
  bankStubCount: number;
}

interface TemplateAccount {
  code: string;
  name: string;
  accountType: string;
  description?: string;
}

interface TemplatePreview extends TemplateSummary {
  accounts: TemplateAccount[];
  bankStubs: { name: string; accountType: string; currency: string }[];
}

interface SetupStatus {
  alreadySetUp: boolean;
  accountCount: number;
  bankAccountCount: number;
}

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Template" },
  { n: 2, label: "Preview" },
  { n: 3, label: "Create" },
  { n: 4, label: "Done" },
];

const TYPE_ORDER = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

export default function CoaSetupWizardPage() {
  const router = useRouter();
  const canCreate = usePermission("finance:account:create");
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("brewery-spirits-tz-sme");
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [createBankStubs, setCreateBankStubs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [alreadySetUpOnCreate, setAlreadySetUpOnCreate] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/finance/accounts/setup");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setStatus(json.data.status);
      setTemplates(json.data.templates ?? []);
      if (json.data.status?.alreadySetUp) {
        setStep(4);
        setAlreadySetUpOnCreate(true);
        setResultMessage("Chart of Accounts is already set up");
        setCreatedCount(json.data.status.accountCount);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (step !== 2 || !selectedId) return;
    let cancelled = false;
    (async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch(`/api/finance/accounts/setup?templateId=${encodeURIComponent(selectedId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load preview");
        if (!cancelled) setPreview(json.data.template);
      } catch {
        if (!cancelled) {
          toast.error("Could not load template preview");
          setPreview(null);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, selectedId]);

  const accountsByType = useMemo(() => {
    if (!preview) return [];
    return TYPE_ORDER.map((type) => ({
      type,
      accounts: preview.accounts.filter((a) => a.accountType === type),
    })).filter((g) => g.accounts.length > 0);
  }, [preview]);

  async function handleCreate() {
    if (!canCreate) {
      toast.error("You do not have permission to create accounts");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/accounts/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedId,
          createBankStubs,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to create CoA");
        return;
      }
      const data = json.data;
      setAlreadySetUpOnCreate(!!data.alreadySetUp);
      setCreatedCount(data.accountCount ?? data.createdAccounts ?? 0);
      setResultMessage(
        data.alreadySetUp
          ? "Chart of Accounts is already set up"
          : data.message || "CoA created"
      );
      if (data.alreadySetUp) {
        toast.message("Already set up", { description: "No accounts were duplicated." });
      } else {
        toast.success(data.message || "Chart of Accounts created");
      }
      setStep(4);
    } catch {
      toast.error("Failed to create CoA");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState text="Loading CoA wizard..." />;
  if (loadError) {
    return (
      <ErrorState
        title="Could not load CoA wizard"
        description="Check your connection and try again."
        onRetry={load}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/finance/accounts"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Chart of Accounts
      </Link>

      <PageHeader
        title="Set up Chart of Accounts"
        description="Bootstrap GL accounts from a template. Safe to re-run — will not duplicate if already set up."
      />

      {/* Step indicator */}
      <nav className="flex flex-wrap gap-2" aria-label="Wizard steps">
        {STEPS.map((s) => {
          const active = step === s.n;
          const done = step > s.n;
          return (
            <div
              key={s.n}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm border ${
                active
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : done
                    ? "border-green-600/40 text-green-700 dark:text-green-400"
                    : "border-muted text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  done ? "bg-green-600 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : s.n}
              </span>
              {s.label}
            </div>
          );
        })}
      </nav>

      {/* Step 1 — Pick template */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose a starter template. You can add or edit accounts after setup.
          </p>
          <div className="grid gap-3">
            {templates.map((t) => {
              const selected = selectedId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`text-left rounded-lg border p-4 transition-colors ${
                    selected
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium">{t.name}</span>
                        {t.id === "brewery-spirits-tz-sme" && (
                          <Badge variant="secondary">Recommended</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.accountCount} accounts
                        {t.bankStubCount > 0 ? ` · ${t.bankStubCount} cash/bank stubs optional` : ""}
                      </p>
                    </div>
                    {selected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!selectedId}>
              Preview accounts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — Preview */}
      {step === 2 && (
        <div className="space-y-4">
          {previewLoading || !preview ? (
            <LoadingState text="Loading preview..." />
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{preview.name}</CardTitle>
                  <CardDescription>
                    {preview.accountCount} accounts will be created (opening balances = 0).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {accountsByType.map((g) => (
                    <div key={g.type}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        {g.type} ({g.accounts.length})
                      </p>
                      <ul className="space-y-1">
                        {g.accounts.map((a) => (
                          <li
                            key={a.code}
                            className="flex gap-3 text-sm border-b border-border/50 py-1.5 last:border-0"
                          >
                            <span className="font-mono text-muted-foreground w-14 shrink-0">{a.code}</span>
                            <span className="flex-1">{a.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(3)}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3 — Create + optional bank stubs */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Create Chart of Accounts
              </CardTitle>
              <CardDescription>
                Template:{" "}
                <span className="font-medium text-foreground">
                  {templates.find((t) => t.id === selectedId)?.name ?? selectedId}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="bankStubs"
                  checked={createBankStubs}
                  onCheckedChange={(v) => setCreateBankStubs(v === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="bankStubs" className="cursor-pointer">
                    Also create default cash / bank stubs
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Adds Cash on Hand and Bank - Operating under Finance → Bank Accounts (TZS, zero balance).
                    You can edit or deactivate them later.
                  </p>
                </div>
              </div>
              {!canCreate && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  You need finance:account:create permission to run setup.
                </p>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !canCreate}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Create CoA
                  <Check className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 — Done */}
      {step === 4 && (
        <Card className="border-green-600/30">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
              <div>
                <p className="font-medium text-lg">
                  {alreadySetUpOnCreate ? "Already set up" : "Chart of Accounts ready"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {alreadySetUpOnCreate
                    ? `This company already has ${createdCount} account${createdCount === 1 ? "" : "s"}. The wizard did not create duplicates.`
                    : resultMessage || `Created ${createdCount} accounts.`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => router.push("/finance/accounts")}>
                View Chart of Accounts
              </Button>
              <Button variant="outline" asChild>
                <Link href="/finance/bank-accounts">Bank accounts</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/finance">Finance overview</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
