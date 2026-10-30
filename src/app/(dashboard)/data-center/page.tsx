"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle, Check, ChevronLeft, ChevronRight, Clock, CloudUpload, Download,
  FileSpreadsheet, FileText, FileArchive, FileImage, ListChecks, Settings2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchInput } from "@/components/shared/SearchInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from "@/hooks/usePermission";
import { cn, formatDate } from "@/lib/utils";
import {
  DATA_CATEGORIES, categoryLabel, extensionOf, formatBytes, frequencyLabel,
  periodLabel, periodShortLabel, type PeriodStatus,
} from "@/modules/data-center/data-center.types";
import { UploadDialog, type UploadDefaults } from "@/components/data-center/UploadDialog";
import { RequirementsDialog, dueRule } from "@/components/data-center/RequirementsDialog";
import { UploadDetailsDialog } from "@/components/data-center/UploadDetailsDialog";
import { downloadUrl, type Department, type Overview, type OverviewPeriod, type Upload } from "@/components/data-center/types";

const PAGE_SIZE = 15;
const ALL = "__all";

const STATUS_STYLE: Record<PeriodStatus, { className: string; icon: typeof Check; label: string }> = {
  SUBMITTED: { className: "border-success/25 bg-success/10 text-success hover:bg-success/15", icon: Check, label: "Submitted" },
  OVERDUE: { className: "border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15", icon: AlertCircle, label: "Overdue" },
  DUE_SOON: { className: "border-warning/30 bg-warning/10 text-warning hover:bg-warning/15", icon: Clock, label: "Due soon" },
  UPCOMING: { className: "border-dashed border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground", icon: Clock, label: "Upcoming" },
};

function fileIcon(name: string) {
  const ext = extensionOf(name);
  if ([".xlsx", ".xls", ".csv"].includes(ext)) return FileSpreadsheet;
  if ([".png", ".jpg", ".jpeg"].includes(ext)) return FileImage;
  if (ext === ".zip") return FileArchive;
  return FileText;
}

export default function DataCenterPage() {
  // useSearchParams needs a Suspense boundary in the app router.
  return (
    <Suspense>
      <DataCenter />
    </Suspense>
  );
}

function DataCenter() {
  const searchParams = useSearchParams();
  const canUpload = usePermission("data:upload:create");
  const canArchive = usePermission("data:upload:archive");
  const canManage = usePermission("data:requirement:manage");

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [uploads, setUploads] = useState<Upload[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [status, setStatus] = useState("CURRENT");
  const [loadingUploads, setLoadingUploads] = useState(true);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDefaults, setUploadDefaults] = useState<UploadDefaults | undefined>();
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const loadOverview = useCallback(() => {
    setOverviewError(null);
    fetch(`/api/data-center/overview?year=${year}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load the checklist");
        setOverview(d.data);
      })
      .catch((e) => setOverviewError(e.message));
  }, [year]);

  const loadUploads = useCallback(() => {
    setLoadingUploads(true);
    const qs = new URLSearchParams({ year: String(year), page: String(page), pageSize: String(PAGE_SIZE), status });
    if (search) qs.set("search", search);
    if (category !== ALL) qs.set("category", category);
    fetch(`/api/data-center/uploads?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setUploads(Array.isArray(d.data) ? d.data : []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => setUploads([]))
      .finally(() => setLoadingUploads(false));
  }, [year, page, status, search, category]);

  const refresh = useCallback(() => {
    loadOverview();
    loadUploads();
  }, [loadOverview, loadUploads]);

  useEffect(() => { setOverview(null); loadOverview(); }, [loadOverview]);
  useEffect(() => { loadUploads(); }, [loadUploads]);
  useEffect(() => { setPage(1); }, [year, search, category, status]);

  useEffect(() => {
    fetch("/api/departments?pageSize=200")
      .then((r) => r.json())
      .then((d) => setDepartments(Array.isArray(d.data) ? d.data.map((x: Department) => ({ id: x.id, name: x.name })) : []))
      .catch(() => {});
  }, []);

  // ⌘K "Upload a file" deep-links here with ?upload=1.
  useEffect(() => {
    if (searchParams.get("upload") === "1" && canUpload) openUpload();
  }, [searchParams, canUpload]);

  function openUpload(defaults?: UploadDefaults) {
    setUploadDefaults(defaults);
    setUploadOpen(true);
  }

  const onPeriodClick = (requirementId: string, p: OverviewPeriod) => {
    if (p.upload) setDetailId(p.upload.id);
    else if (canUpload) openUpload({ requirementId, periodKey: p.key });
  };

  const totals = overview?.totals;
  const completion = totals && totals.expected ? Math.round((totals.SUBMITTED / totals.expected) * 100) : 0;
  const activeRequirements = useMemo(() => overview?.requirements ?? [], [overview]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Center"
        description="Files the company submits on a schedule — budgets, statutory returns, licences, targets — with a yearly checklist and full version history."
        actions={
          <>
            <div className="flex items-center rounded-md border" role="group" aria-label="Year">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">
                <ChevronLeft />
              </Button>
              <span className="min-w-14 px-1 text-center text-sm font-semibold tabular-nums" aria-live="polite">{year}</span>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setYear((y) => y + 1)} aria-label="Next year">
                <ChevronRight />
              </Button>
            </div>
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => setRequirementsOpen(true)}>
                <Settings2 /> Requirements
              </Button>
            )}
            {canUpload && (
              <Button size="sm" onClick={() => openUpload()}>
                <CloudUpload /> Upload file
              </Button>
            )}
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Completion" loading={!overview}>
          <p className="text-2xl font-bold tabular-nums">{completion}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${completion}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{totals?.SUBMITTED ?? 0} of {totals?.expected ?? 0} submissions</p>
        </StatCard>
        <StatCard label="Overdue" loading={!overview} tone={totals?.OVERDUE ? "destructive" : undefined}>
          <p className="text-2xl font-bold tabular-nums">{totals?.OVERDUE ?? 0}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">Past their due date</p>
        </StatCard>
        <StatCard label="Due soon" loading={!overview} tone={totals?.DUE_SOON ? "warning" : undefined}>
          <p className="text-2xl font-bold tabular-nums">{totals?.DUE_SOON ?? 0}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">Within the next 14 days</p>
        </StatCard>
        <StatCard label="Upcoming" loading={!overview}>
          <p className="text-2xl font-bold tabular-nums">{totals?.UPCOMING ?? 0}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">Later in {year}</p>
        </StatCard>
      </div>

      {/* Checklist */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-4 w-4" /> Required submissions · {year}</CardTitle>
            <CardDescription className="mt-1">Click a period to upload its file, or open what was submitted.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-hidden>
            {(Object.keys(STATUS_STYLE) as PeriodStatus[]).map((s) => {
              const Icon = STATUS_STYLE[s].icon;
              return (
                <span key={s} className="flex items-center gap-1">
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded border", STATUS_STYLE[s].className)}><Icon className="h-2.5 w-2.5" /></span>
                  {STATUS_STYLE[s].label}
                </span>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {overviewError ? (
            <EmptyState compact title="Could not load the checklist" description={overviewError} action={<Button variant="outline" size="sm" onClick={loadOverview}>Retry</Button>} />
          ) : !overview ? (
            <div className="space-y-3 px-6 pb-6">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : activeRequirements.length === 0 ? (
            <EmptyState
              compact
              icon={<ListChecks className="h-5 w-5" />}
              title="No required submissions yet"
              description="List what this company must upload — e.g. the annual budget each January or the monthly excise return by the 7th — and track it here every year."
              action={canManage && <Button size="sm" onClick={() => setRequirementsOpen(true)}>Set up requirements</Button>}
            />
          ) : (
            <ul className="divide-y border-t">
              {activeRequirements.map((req) => (
                <li key={req.id} className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:gap-6">
                  <div className="min-w-0 lg:w-72 lg:shrink-0">
                    <p className="truncate text-sm font-medium">{req.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      <span>{categoryLabel(req.category)}</span>·<span>{frequencyLabel(req.frequency)}</span>
                      {req.departmentName && <>·<span>{req.departmentName}</span></>}
                    </p>
                    <p className="text-xs text-muted-foreground">{dueRule(req)}</p>
                  </div>
                  <div className={cn("grid flex-1 gap-1.5", req.frequency === "MONTHLY" ? "grid-cols-6 sm:grid-cols-12" : req.frequency === "QUARTERLY" ? "grid-cols-4" : "grid-cols-1 sm:max-w-48")}>
                    {req.periods.map((p) => {
                      const style = STATUS_STYLE[p.status];
                      const Icon = style.icon;
                      const clickable = !!p.upload || canUpload;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          disabled={!clickable}
                          onClick={() => onPeriodClick(req.id, p)}
                          title={`${p.label} · due ${formatDate(p.dueDate)} · ${style.label}${p.upload ? ` · ${p.upload.fileName} (v${p.upload.version})` : ""}`}
                          aria-label={`${req.name}, ${p.label}: ${style.label}`}
                          className={cn(
                            "flex h-9 items-center justify-center gap-1 rounded-md border px-1 text-xs font-medium transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                            style.className
                          )}
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{req.frequency === "ANNUAL" ? (p.upload ? `v${p.upload.version} submitted` : `Due ${formatDate(p.dueDate)}`) : periodShortLabel(p.key)}</span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Library */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold">Files · {year}</h2>
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search files…" className="w-full sm:w-56" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {DATA_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CURRENT">Current files</SelectItem>
                <SelectItem value="SUPERSEDED">Older versions</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
                <SelectItem value="ALL">Everything</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable<Upload>
          loading={loadingUploads}
          data={uploads}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          emptyTitle={search || category !== ALL ? "No files match" : `No files for ${year} yet`}
          emptyDescription={canUpload ? "Upload budgets, returns, licences, price lists or any file the business needs to keep for the year." : undefined}
          emptyAction={canUpload && !search && category === ALL ? <Button size="sm" onClick={() => openUpload()}><CloudUpload /> Upload file</Button> : undefined}
          columns={[
            {
              key: "title",
              header: "File",
              exportValue: (u) => u.title,
              cell: (u) => {
                const Icon = fileIcon(u.fileName);
                return (
                  <button type="button" onClick={() => setDetailId(u.id)} className="group flex min-w-0 items-center gap-3 text-left">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium group-hover:underline">{u.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{u.fileName} · {formatBytes(u.sizeBytes)}</span>
                    </span>
                  </button>
                );
              },
            },
            { key: "category", header: "Category", exportValue: (u) => categoryLabel(u.category), cell: (u) => <Badge variant="outline">{categoryLabel(u.category)}</Badge> },
            { key: "periodKey", header: "Period", exportValue: (u) => periodLabel(u.periodKey), cell: (u) => periodLabel(u.periodKey) },
            {
              key: "requirement",
              header: "For",
              exportValue: (u) => u.requirement?.name ?? u.departmentName ?? "",
              cell: (u) => (
                <span className="text-sm">
                  {u.requirement?.name ?? <span className="text-muted-foreground">Ad-hoc</span>}
                  {u.departmentName && <span className="block text-xs text-muted-foreground">{u.departmentName}</span>}
                </span>
              ),
            },
            {
              key: "version",
              header: "Version",
              exportValue: (u) => u.version,
              cell: (u) => (
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-xs">v{u.version}</span>
                  {u.status !== "CURRENT" && <Badge variant="secondary">{u.status === "ARCHIVED" ? "Archived" : "Superseded"}</Badge>}
                </span>
              ),
            },
            {
              key: "createdAt",
              header: "Uploaded",
              exportValue: (u) => `${u.uploadedByName} ${formatDate(u.createdAt)}`,
              cell: (u) => <span className="text-sm">{u.uploadedByName}<span className="block text-xs text-muted-foreground">{formatDate(u.createdAt)}</span></span>,
            },
            {
              key: "download",
              header: "",
              cell: (u) => (
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                  <a href={downloadUrl(u.id)} aria-label={`Download ${u.fileName}`}><Download /></a>
                </Button>
              ),
            },
          ]}
          exportable
          exportFilename={`data-center-${year}`}
        />
      </div>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        year={year}
        requirements={activeRequirements}
        departments={departments}
        defaults={uploadDefaults}
        onUploaded={refresh}
      />
      <RequirementsDialog open={requirementsOpen} onOpenChange={setRequirementsOpen} departments={departments} onChanged={loadOverview} />
      <UploadDetailsDialog
        uploadId={detailId}
        onOpenChange={(o) => !o && setDetailId(null)}
        canUpload={canUpload}
        canArchive={canArchive}
        onNewVersion={(requirementId, periodKey) => openUpload({ requirementId, periodKey })}
        onChanged={refresh}
      />
    </div>
  );
}

function StatCard({ label, loading, tone, children }: { label: string; loading: boolean; tone?: "destructive" | "warning"; children: React.ReactNode }) {
  return (
    <Card className={cn(tone === "destructive" && "border-destructive/30", tone === "warning" && "border-warning/30")}>
      <CardContent className="p-4 sm:p-5">
        <p className={cn(
          "mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
          tone === "destructive" && "text-destructive",
          tone === "warning" && "text-warning"
        )}>
          {label}
        </p>
        {loading ? <Skeleton className="h-8 w-16" /> : children}
      </CardContent>
    </Card>
  );
}
