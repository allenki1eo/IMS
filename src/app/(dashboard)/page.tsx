"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileSearch,
  Fuel,
  GitBranch,
  Landmark,
  Package,
  PackageCheck,
  Receipt,
  SearchIcon,
  SendHorizonal,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn, formatDateTime } from "@/lib/utils";
import type { AuthUser } from "@/types/auth";

/* ─────────────── Types ─────────────── */

interface DashboardStats {
  userCount: number;
  employeeCount: number;
  branchCount: number;
  departmentCount: number;
  pendingApprovals: number;
  itemCount: number;
  stockPositions: number;
  activeVehicles: number;
  activeTrips: number;
  openWorkOrders: number;
  purchaseRequests: number;
  purchaseOrders: number;
  productionBatches: number;
  pendingQualityTests: number;
  openNonConformances: number;
  dispatchOrders: number;
  fuelTanks: number;
  accountCount: number;
  bankAccountCount: number;
  pendingPayments: number;
}

type StatKey = keyof DashboardStats;

interface TrendPoint {
  month: string;
  grns: number;
  trips: number;
  fuelIssues: number;
  workOrders: number;
  batches: number;
  dispatchOrders: number;
}

interface AuditEntry {
  id: string;
  action: string;
  module: string;
  resource: string;
  description: string;
  userName: string;
  createdAt: string;
}

interface RoleProfile {
  title: string;
  eyebrow: string;
  summary: string;
  priority: string[];
}

interface MetricConfig {
  key: StatKey;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  permissions: string[];
  color: string;
}

interface ModuleConfig {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  permissions: string[];
  stats: { label: string; key: StatKey }[];
}

interface ActionConfig {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  permissions: string[];
}

/* ─────────────── Constants ─────────────── */

const EMPTY_STATS: DashboardStats = {
  userCount: 0, employeeCount: 0, branchCount: 0, departmentCount: 0,
  pendingApprovals: 0, itemCount: 0, stockPositions: 0, activeVehicles: 0,
  activeTrips: 0, openWorkOrders: 0, purchaseRequests: 0, purchaseOrders: 0,
  productionBatches: 0, pendingQualityTests: 0, openNonConformances: 0,
  dispatchOrders: 0, fuelTanks: 0, accountCount: 0, bankAccountCount: 0,
  pendingPayments: 0,
};

const ROLE_PROFILES: Record<string, RoleProfile> = {
  SUPER_ADMIN: {
    title: "Command Center",
    eyebrow: "Full system access",
    summary: "Company health, security, approvals, and every operating module in one view.",
    priority: ["pendingApprovals", "userCount", "employeeCount", "stockPositions"],
  },
  COMPANY_ADMIN: {
    title: "Administration Hub",
    eyebrow: "Company administration",
    summary: "Users, roles, branches, departments, approvals, and operating readiness.",
    priority: ["userCount", "employeeCount", "branchCount", "pendingApprovals"],
  },
  BRANCH_MANAGER: {
    title: "Branch Operations",
    eyebrow: "Branch management",
    summary: "Operational activity across warehouse, transport, fuel, maintenance, and approvals.",
    priority: ["activeTrips", "stockPositions", "openWorkOrders", "pendingApprovals"],
  },
  DEPT_HEAD: {
    title: "Department Desk",
    eyebrow: "Department leadership",
    summary: "Requests, team activity, work queues, and approvals that need attention.",
    priority: ["purchaseRequests", "productionBatches", "pendingQualityTests", "pendingApprovals"],
  },
  MANAGEMENT: {
    title: "Management Overview",
    eyebrow: "Executive workspace",
    summary: "Read-only visibility into performance, exceptions, and approval pressure.",
    priority: ["pendingApprovals", "activeTrips", "productionBatches", "dispatchOrders"],
  },
  AUDITOR: {
    title: "Audit Workspace",
    eyebrow: "Audit and compliance",
    summary: "Traceable activity, open exceptions, approvals, and module coverage.",
    priority: ["pendingApprovals", "openNonConformances", "userCount", "branchCount"],
  },
};

const DEFAULT_PROFILE: RoleProfile = {
  title: "My Dashboard",
  eyebrow: "Personal workspace",
  summary: "Your available modules, open work, and shortcuts based on assigned access.",
  priority: ["pendingApprovals", "employeeCount", "branchCount", "departmentCount"],
};

const METRICS: MetricConfig[] = [
  {
    key: "pendingApprovals",
    title: "Pending approvals",
    description: "Items waiting for review",
    href: "/approvals",
    icon: CheckCircle2,
    permissions: ["approvals:request:read", "approvals:request:approve"],
    color: "hsl(var(--foreground))",
  },
  {
    key: "userCount",
    title: "Active users",
    description: "Enabled system accounts",
    href: "/admin/users",
    icon: Users,
    permissions: ["users:user:read"],
    color: "hsl(var(--foreground))",
  },
  {
    key: "employeeCount",
    title: "Employees",
    description: "Active employee records",
    href: "/employees",
    icon: UserCheck,
    permissions: ["employees:employee:read"],
    color: "hsl(var(--foreground))",
  },
  {
    key: "stockPositions",
    title: "Stock positions",
    description: "Locations carrying stock",
    href: "/warehouse/stock",
    icon: Boxes,
    permissions: ["warehouse:stock:read"],
    color: "hsl(var(--foreground))",
  },
  {
    key: "activeTrips",
    title: "Active trips",
    description: "Planned or in motion",
    href: "/transport/trips",
    icon: Truck,
    permissions: ["transport:trip:read"],
    color: "hsl(var(--foreground))",
  },
  {
    key: "openWorkOrders",
    title: "Work orders",
    description: "Open maintenance jobs",
    href: "/maintenance/work-orders",
    icon: Wrench,
    permissions: ["maintenance:workorder:read"],
    color: "hsl(var(--foreground))",
  },
  {
    key: "purchaseRequests",
    title: "Purchase requests",
    description: "Submitted or approved",
    href: "/procurement/requests",
    icon: ShoppingCart,
    permissions: ["procurement:request:read"],
    color: "hsl(var(--foreground))",
  },
  {
    key: "pendingPayments",
    title: "Pending payments",
    description: "Payments awaiting completion",
    href: "/finance/payments",
    icon: Receipt,
    permissions: ["finance:payment:read"],
    color: "hsl(var(--foreground))",
  },
];

const MODULES: ModuleConfig[] = [
  { title: "Administration", description: "Users, roles, and account control.", href: "/admin/users", icon: ShieldCheck, permissions: ["users:user:read"], stats: [{ label: "Users", key: "userCount" }, { label: "Branches", key: "branchCount" }] },
  { title: "Company", description: "Branches, departments, and structure.", href: "/company", icon: Building2, permissions: ["company:company:read"], stats: [{ label: "Branches", key: "branchCount" }, { label: "Departments", key: "departmentCount" }] },
  { title: "Warehouse", description: "Items, stock, GRN, transfers.", href: "/warehouse", icon: Package, permissions: ["warehouse:stock:read"], stats: [{ label: "Items", key: "itemCount" }, { label: "Stock", key: "stockPositions" }] },
  { title: "Transport", description: "Vehicles, drivers, and trips.", href: "/transport", icon: Truck, permissions: ["transport:vehicle:read"], stats: [{ label: "Vehicles", key: "activeVehicles" }, { label: "Trips", key: "activeTrips" }] },
  { title: "Procurement", description: "Suppliers, requests, and orders.", href: "/procurement", icon: ShoppingCart, permissions: ["procurement:request:read"], stats: [{ label: "Requests", key: "purchaseRequests" }, { label: "Orders", key: "purchaseOrders" }] },
  { title: "Production", description: "Lines, recipes, and batches.", href: "/production", icon: Factory, permissions: ["production:batch:read"], stats: [{ label: "Batches", key: "productionBatches" }, { label: "Items", key: "itemCount" }] },
  { title: "Quality Control", description: "Standards, tests, and NCRs.", href: "/qc", icon: ClipboardCheck, permissions: ["qc:test:read"], stats: [{ label: "Tests", key: "pendingQualityTests" }, { label: "NCRs", key: "openNonConformances" }] },
  { title: "Dispatch", description: "Inventory lots and deliveries.", href: "/dispatch", icon: SendHorizonal, permissions: ["dispatch:order:read"], stats: [{ label: "Orders", key: "dispatchOrders" }, { label: "Vehicles", key: "activeVehicles" }] },
  { title: "Finance", description: "Accounts, journals, and payments.", href: "/finance", icon: Landmark, permissions: ["finance:account:read"], stats: [{ label: "Accounts", key: "accountCount" }, { label: "Pending", key: "pendingPayments" }] },
];

const ACTIONS: ActionConfig[] = [
  { title: "Review approvals", description: "Open pending approvals.", href: "/approvals", icon: CheckCircle2, permissions: ["approvals:request:read"] },
  { title: "Receive goods", description: "Create a goods receipt.", href: "/warehouse/grn/new", icon: PackageCheck, permissions: ["warehouse:grn:create"] },
  { title: "Plan a trip", description: "Create a transport trip.", href: "/transport/trips/new", icon: Truck, permissions: ["transport:trip:create"] },
  { title: "Open work order", description: "Create maintenance work.", href: "/maintenance/work-orders/new", icon: Wrench, permissions: ["maintenance:workorder:create"] },
  { title: "Purchase request", description: "Request materials or services.", href: "/procurement/requests/new", icon: ShoppingCart, permissions: ["procurement:request:create"] },
  { title: "Start lab test", description: "Create a QC test.", href: "/qc/tests/new", icon: FileSearch, permissions: ["qc:test:create"] },
  { title: "New dispatch order", description: "Prepare customer delivery.", href: "/dispatch/orders/new", icon: SendHorizonal, permissions: ["dispatch:order:create"] },
  { title: "Journal entry", description: "Record a finance entry.", href: "/finance/journal-entries/new", icon: Landmark, permissions: ["finance:journal:create"] },
];

/* ─────────────── Helpers ─────────────── */

function hasAccess(user: AuthUser | null, permissions: string[]) {
  if (!user) return false;
  if (user.permissions.includes("*")) return true;
  return permissions.some((p) => user.permissions.includes(p));
}

function getRoleProfile(user: AuthUser | null): RoleProfile {
  if (!user) return DEFAULT_PROFILE;
  const order = ["SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER", "DEPT_HEAD", "MANAGEMENT", "AUDITOR"];
  const role = order.find((c) => user.roles.includes(c));
  return role ? ROLE_PROFILES[role] : DEFAULT_PROFILE;
}

function formatRole(code: string) {
  return code.split("_").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function generateSparkData(currentValue: number): { v: number }[] {
  const seed = currentValue || 3;
  return [
    { v: Math.max(1, seed * 0.6) },
    { v: Math.max(1, seed * 0.9) },
    { v: Math.max(1, seed * 0.5) },
    { v: Math.max(1, seed * 1.2) },
    { v: Math.max(1, seed * 0.8) },
    { v: Math.max(1, seed * 1.1) },
    { v: Math.max(1, seed) },
  ];
}

/* ─────────────── Sub-components ─────────────── */

function KpiCard({ metric, value, loading }: { metric: MetricConfig; value: number; loading: boolean }) {
  const Icon = metric.icon;
  const sparkData = useMemo(() => generateSparkData(value), [value]);

  return (
    <Link href={metric.href} className="group block">
      <Card className="h-full hover:shadow-md transition-all hover:-translate-y-0.5">
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {metric.title}
                </p>
                <Icon className="h-4 w-4 text-muted-foreground/60" />
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-3xl font-bold tracking-tight tabular-nums">
                    {formatNumber(value)}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground truncate">{metric.description}</p>
                </div>

                {/* Sparkline */}
                <div className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  <ResponsiveContainer width={72} height={36}>
                    <BarChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Bar dataKey="v" fill="currentColor" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">View details</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function ModuleCard({ module, stats }: { module: ModuleConfig; stats: DashboardStats }) {
  const Icon = module.icon;
  return (
    <Link href={module.href} className="group block">
      <div className="flex items-center gap-3 p-3 rounded-lg border hover:border-foreground/20 hover:bg-muted/30 transition-all">
        <div className="shrink-0 rounded-md border bg-background p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{module.title}</p>
          <p className="text-xs text-muted-foreground truncate">{module.description}</p>
        </div>
        <div className="shrink-0 flex items-center gap-3 text-xs">
          {module.stats.map((s) => (
            <div key={s.label} className="text-right">
              <div className="font-semibold tabular-nums">{formatNumber(stats[s.key])}</div>
              <div className="text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

function ActionLink({ action }: { action: ActionConfig }) {
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      className="flex items-center gap-3 p-3 rounded-lg border hover:border-foreground/20 hover:bg-muted/30 transition-all group"
    >
      <div className="shrink-0 rounded-md border bg-background p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{action.title}</p>
        <p className="text-xs text-muted-foreground truncate">{action.description}</p>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-gray-100 text-gray-700",
  LOGOUT: "bg-gray-100 text-gray-700",
  APPROVE: "bg-violet-100 text-violet-700",
  REJECT: "bg-red-100 text-red-700",
  SUBMIT: "bg-amber-100 text-amber-700",
};

function actionColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find((k) => action.startsWith(k));
  return key ? ACTION_COLORS[key] : "bg-gray-100 text-gray-600";
}

const TREND_SERIES = [
  { key: "grns", label: "GRN", color: "#1a1a1a" },
  { key: "trips", label: "Trips", color: "#555" },
  { key: "workOrders", label: "Work Orders", color: "#999" },
  { key: "batches", label: "Batches", color: "#bbb" },
];

/* ─────────────── Page ─────────────── */

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logSearch, setLogSearch] = useState("");
  const [activeSeries, setActiveSeries] = useState<Set<string>>(new Set(["grns", "trips"]));

  useEffect(() => {
    const statsP = fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => setStats({ ...EMPTY_STATS, ...d.data }))
      .catch(() => {});

    const trendsP = fetch("/api/analytics/trends?months=6")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.data)) setTrends(d.data); })
      .catch(() => {});

    const logsP = fetch("/api/audit-logs?pageSize=8&page=1")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.data)) setRecentLogs(d.data); })
      .catch(() => {});

    Promise.all([statsP, trendsP, logsP]).finally(() => setLoading(false));
  }, []);

  const profile = useMemo(() => getRoleProfile(user), [user]);
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const visibleMetrics = useMemo(() => {
    const allowed = METRICS.filter((m) => hasAccess(user, m.permissions));
    return [...allowed].sort((a, b) => {
      const ar = profile.priority.indexOf(a.key);
      const br = profile.priority.indexOf(b.key);
      return (ar === -1 ? 99 : ar) - (br === -1 ? 99 : br);
    }).slice(0, 4);
  }, [profile, user]);

  const visibleModules = useMemo(
    () => MODULES.filter((m) => hasAccess(user, m.permissions)).slice(0, 8),
    [user]
  );

  const visibleActions = useMemo(
    () => ACTIONS.filter((a) => hasAccess(user, a.permissions)).slice(0, 5),
    [user]
  );

  const filteredLogs = useMemo(() => {
    if (!logSearch.trim()) return recentLogs;
    const q = logSearch.toLowerCase();
    return recentLogs.filter(
      (l) =>
        l.action?.toLowerCase().includes(q) ||
        l.module?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.userName?.toLowerCase().includes(q)
    );
  }, [recentLogs, logSearch]);

  const toggleSeries = (key: string) => {
    setActiveSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Welcome banner ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              <Sparkles className="mr-1.5 h-3 w-3" />
              {profile.eyebrow}
            </Badge>
            {user?.roles.map((role) => (
              <Badge key={role} variant="outline" className="text-[10px] uppercase tracking-wider">
                {formatRole(role)}
              </Badge>
            ))}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting}, {user?.fullName?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">{profile.summary}</p>
        </div>
        <div className="shrink-0 rounded-lg border bg-muted/40 px-5 py-4 sm:min-w-52">
          <div className="flex items-center gap-2 text-sm font-medium mb-1">
            <CalendarCheck className="h-4 w-4" />
            Today
          </div>
          <div className="text-sm text-muted-foreground mb-2">{formatDateTime(new Date())}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            {profile.title}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibleMetrics.map((metric) => (
          <KpiCard key={metric.key} metric={metric} value={stats[metric.key]} loading={loading} />
        ))}
        {loading && visibleMetrics.length === 0 &&
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5 space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-32" /></CardContent></Card>
          ))
        }
      </div>

      {/* ── Trend chart + Modules ── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* Trend chart */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Activity Trend</p>
                <CardTitle className="text-lg">6-Month Operations Overview</CardTitle>
                <CardDescription>GRNs, trips, work orders, and batches by month.</CardDescription>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {TREND_SERIES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => toggleSeries(s.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                      activeSeries.has(s.key)
                        ? "bg-foreground text-background border-foreground"
                        : "text-muted-foreground border-border hover:border-foreground/30"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeSeries.has(s.key) ? "currentColor" : s.color }} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading || trends.length === 0 ? (
              <div className="h-56 flex items-center justify-center">
                {loading
                  ? <Skeleton className="h-40 w-full" />
                  : <p className="text-sm text-muted-foreground">No trend data available yet.</p>
                }
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trends} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    cursor={{ fill: "hsl(var(--muted))" }}
                  />
                  {TREND_SERIES.filter((s) => activeSeries.has(s.key)).map((s) => (
                    <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions + Operating Footprint */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Quick Actions</p>
              <CardTitle className="text-base">Shortcuts</CardTitle>
              <CardDescription>Matched to your permissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {visibleActions.length > 0 ? (
                visibleActions.map((action) => <ActionLink key={action.title} action={action} />)
              ) : (
                <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                  You have read-only access.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Operating Footprint</p>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="h-4 w-4" /> Company Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Branches", value: stats.branchCount },
                { label: "Departments", value: stats.departmentCount },
                { label: "Active employees", value: stats.employeeCount },
                { label: "Active vehicles", value: stats.activeVehicles },
                { label: "Finance accounts", value: stats.accountCount },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold tabular-nums">{formatNumber(item.value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Your Modules ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Modules</p>
              <CardTitle className="text-base">Your Modules</CardTitle>
              <CardDescription>Visible based on your current role access.</CardDescription>
            </div>
            <Badge variant="outline">{visibleModules.length} available</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : visibleModules.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {visibleModules.map((module) => (
                <ModuleCard key={module.title} module={module} stats={stats} />
              ))}
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-8 text-center">
              <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No modules assigned yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Activity ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Audit Trail</p>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Latest system events across all modules.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search activity..."
                  className="h-8 pl-8 pr-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-full sm:w-48"
                />
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/audit-logs">View all</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 pb-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="px-6 pb-6 text-center py-8 text-sm text-muted-foreground">
              {logSearch ? `No results for "${logSearch}"` : "No recent activity yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-t border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Module</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Description</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", actionColor(log.action))}>
                          {log.action?.split("_")[0] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium capitalize">{log.module}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{log.description}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium">{log.userName}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
