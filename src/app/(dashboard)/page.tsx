"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
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
  LayoutDashboard,
  Package,
  PackageCheck,
  Receipt,
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
import { LoadingState } from "@/components/shared/LoadingState";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn, formatDateTime } from "@/lib/utils";
import type { AuthUser } from "@/types/auth";

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

interface RoleProfile {
  title: string;
  eyebrow: string;
  summary: string;
  accent: string;
  priority: string[];
}

interface MetricConfig {
  key: StatKey;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  permissions: string[];
  accent: string;
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

const EMPTY_STATS: DashboardStats = {
  userCount: 0,
  employeeCount: 0,
  branchCount: 0,
  departmentCount: 0,
  pendingApprovals: 0,
  itemCount: 0,
  stockPositions: 0,
  activeVehicles: 0,
  activeTrips: 0,
  openWorkOrders: 0,
  purchaseRequests: 0,
  purchaseOrders: 0,
  productionBatches: 0,
  pendingQualityTests: 0,
  openNonConformances: 0,
  dispatchOrders: 0,
  fuelTanks: 0,
  accountCount: 0,
  bankAccountCount: 0,
  pendingPayments: 0,
};

const ROLE_PROFILES: Record<string, RoleProfile> = {
  SUPER_ADMIN: {
    title: "Command Center",
    eyebrow: "Full system access",
    summary: "Company health, security, approvals, and every operating module in one view.",
    accent: "from-sky-600 via-cyan-500 to-emerald-500",
    priority: ["pendingApprovals", "userCount", "employeeCount", "branchCount"],
  },
  COMPANY_ADMIN: {
    title: "Administration Hub",
    eyebrow: "Company administration",
    summary: "Users, roles, branches, departments, approvals, and operating readiness.",
    accent: "from-indigo-600 via-sky-500 to-teal-500",
    priority: ["userCount", "employeeCount", "branchCount", "pendingApprovals"],
  },
  BRANCH_MANAGER: {
    title: "Branch Operations",
    eyebrow: "Branch management",
    summary: "Operational activity across warehouse, transport, fuel, maintenance, and approvals.",
    accent: "from-emerald-600 via-teal-500 to-sky-500",
    priority: ["activeTrips", "stockPositions", "openWorkOrders", "pendingApprovals"],
  },
  DEPT_HEAD: {
    title: "Department Desk",
    eyebrow: "Department leadership",
    summary: "Requests, team activity, work queues, and approvals that need attention.",
    accent: "from-amber-500 via-orange-500 to-rose-500",
    priority: ["purchaseRequests", "productionBatches", "pendingQualityTests", "pendingApprovals"],
  },
  MANAGEMENT: {
    title: "Management Overview",
    eyebrow: "Executive workspace",
    summary: "Read-only visibility into performance, exceptions, and approval pressure.",
    accent: "from-slate-700 via-sky-600 to-emerald-500",
    priority: ["pendingApprovals", "activeTrips", "productionBatches", "dispatchOrders"],
  },
  AUDITOR: {
    title: "Audit Workspace",
    eyebrow: "Audit and compliance",
    summary: "Traceable activity, open exceptions, approvals, and module coverage.",
    accent: "from-zinc-700 via-stone-600 to-amber-500",
    priority: ["pendingApprovals", "openNonConformances", "userCount", "branchCount"],
  },
};

const DEFAULT_PROFILE: RoleProfile = {
  title: "My Dashboard",
  eyebrow: "Personal workspace",
  summary: "Your available modules, open work, and shortcuts based on assigned access.",
  accent: "from-sky-600 via-teal-500 to-amber-500",
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
    accent: "border-l-sky-500 bg-sky-500/5 text-sky-700",
  },
  {
    key: "userCount",
    title: "Active users",
    description: "Enabled system accounts",
    href: "/admin/users",
    icon: Users,
    permissions: ["users:user:read"],
    accent: "border-l-violet-500 bg-violet-500/5 text-violet-700",
  },
  {
    key: "employeeCount",
    title: "Employees",
    description: "Active employee records",
    href: "/employees",
    icon: UserCheck,
    permissions: ["employees:employee:read"],
    accent: "border-l-emerald-500 bg-emerald-500/5 text-emerald-700",
  },
  {
    key: "stockPositions",
    title: "Stock positions",
    description: "Locations carrying stock",
    href: "/warehouse/stock",
    icon: Boxes,
    permissions: ["warehouse:stock:read"],
    accent: "border-l-amber-500 bg-amber-500/5 text-amber-700",
  },
  {
    key: "activeTrips",
    title: "Active trips",
    description: "Planned or in motion",
    href: "/transport/trips",
    icon: Truck,
    permissions: ["transport:trip:read"],
    accent: "border-l-cyan-500 bg-cyan-500/5 text-cyan-700",
  },
  {
    key: "openWorkOrders",
    title: "Work orders",
    description: "Open maintenance jobs",
    href: "/maintenance/work-orders",
    icon: Wrench,
    permissions: ["maintenance:workorder:read"],
    accent: "border-l-orange-500 bg-orange-500/5 text-orange-700",
  },
  {
    key: "purchaseRequests",
    title: "Purchase requests",
    description: "Submitted or approved",
    href: "/procurement/requests",
    icon: ShoppingCart,
    permissions: ["procurement:request:read"],
    accent: "border-l-rose-500 bg-rose-500/5 text-rose-700",
  },
  {
    key: "productionBatches",
    title: "Production batches",
    description: "Planned or in progress",
    href: "/production/batches",
    icon: Factory,
    permissions: ["production:batch:read"],
    accent: "border-l-lime-600 bg-lime-500/5 text-lime-700",
  },
  {
    key: "pendingQualityTests",
    title: "Quality tests",
    description: "Pending lab work",
    href: "/qc/tests",
    icon: FileSearch,
    permissions: ["qc:test:read"],
    accent: "border-l-fuchsia-500 bg-fuchsia-500/5 text-fuchsia-700",
  },
  {
    key: "dispatchOrders",
    title: "Dispatch orders",
    description: "Confirmed or dispatched",
    href: "/dispatch/orders",
    icon: SendHorizonal,
    permissions: ["dispatch:order:read"],
    accent: "border-l-teal-500 bg-teal-500/5 text-teal-700",
  },
  {
    key: "accountCount",
    title: "Finance accounts",
    description: "Active chart accounts",
    href: "/finance/accounts",
    icon: Landmark,
    permissions: ["finance:account:read"],
    accent: "border-l-slate-500 bg-slate-500/5 text-slate-700",
  },
  {
    key: "pendingPayments",
    title: "Pending payments",
    description: "Payments awaiting completion",
    href: "/finance/payments",
    icon: Receipt,
    permissions: ["finance:payment:read"],
    accent: "border-l-stone-500 bg-stone-500/5 text-stone-700",
  },
];

const MODULES: ModuleConfig[] = [
  {
    title: "Administration",
    description: "Users, roles, and account control.",
    href: "/admin/users",
    icon: ShieldCheck,
    permissions: ["users:user:read", "roles:role:read"],
    stats: [
      { label: "Users", key: "userCount" },
      { label: "Branches", key: "branchCount" },
    ],
  },
  {
    title: "Company",
    description: "Branches, departments, and structure.",
    href: "/company",
    icon: Building2,
    permissions: ["company:company:read", "company:branch:read"],
    stats: [
      { label: "Branches", key: "branchCount" },
      { label: "Departments", key: "departmentCount" },
    ],
  },
  {
    title: "Warehouse",
    description: "Items, stock, GRN, transfers, and adjustments.",
    href: "/warehouse",
    icon: Package,
    permissions: ["warehouse:stock:read", "warehouse:item:read"],
    stats: [
      { label: "Items", key: "itemCount" },
      { label: "Stock", key: "stockPositions" },
    ],
  },
  {
    title: "Transport",
    description: "Vehicles, drivers, assignments, and trips.",
    href: "/transport",
    icon: Truck,
    permissions: ["transport:vehicle:read", "transport:trip:read"],
    stats: [
      { label: "Vehicles", key: "activeVehicles" },
      { label: "Trips", key: "activeTrips" },
    ],
  },
  {
    title: "Fuel",
    description: "Tanks, receipts, issues, prices, and reports.",
    href: "/fuel",
    icon: Fuel,
    permissions: ["fuel:tank:read", "fuel:report:read"],
    stats: [
      { label: "Tanks", key: "fuelTanks" },
      { label: "Vehicles", key: "activeVehicles" },
    ],
  },
  {
    title: "Maintenance",
    description: "Schedules, work orders, spare parts, and receipts.",
    href: "/maintenance",
    icon: Wrench,
    permissions: ["maintenance:workorder:read", "maintenance:schedule:read"],
    stats: [
      { label: "Open jobs", key: "openWorkOrders" },
      { label: "Vehicles", key: "activeVehicles" },
    ],
  },
  {
    title: "Procurement",
    description: "Suppliers, requests, orders, and receiving.",
    href: "/procurement",
    icon: ShoppingCart,
    permissions: ["procurement:request:read", "procurement:order:read"],
    stats: [
      { label: "Requests", key: "purchaseRequests" },
      { label: "Orders", key: "purchaseOrders" },
    ],
  },
  {
    title: "Production",
    description: "Lines, recipes, batches, and brewing activity.",
    href: "/production",
    icon: Factory,
    permissions: ["production:batch:read", "production:line:read"],
    stats: [
      { label: "Batches", key: "productionBatches" },
      { label: "Items", key: "itemCount" },
    ],
  },
  {
    title: "Quality Control",
    description: "Standards, lab tests, and non-conformances.",
    href: "/qc",
    icon: ClipboardCheck,
    permissions: ["qc:test:read", "qc:ncr:read"],
    stats: [
      { label: "Tests", key: "pendingQualityTests" },
      { label: "NCRs", key: "openNonConformances" },
    ],
  },
  {
    title: "Dispatch",
    description: "Finished goods, inventory lots, and deliveries.",
    href: "/dispatch",
    icon: SendHorizonal,
    permissions: ["dispatch:order:read", "dispatch:lot:read"],
    stats: [
      { label: "Orders", key: "dispatchOrders" },
      { label: "Vehicles", key: "activeVehicles" },
    ],
  },
  {
    title: "Finance",
    description: "Accounts, journals, bank accounts, payments, and reports.",
    href: "/finance",
    icon: Landmark,
    permissions: ["finance:account:read", "finance:report:read"],
    stats: [
      { label: "Accounts", key: "accountCount" },
      { label: "Pending", key: "pendingPayments" },
    ],
  },
  {
    title: "Analytics",
    description: "Operations and financial dashboards.",
    href: "/analytics",
    icon: BarChart3,
    permissions: ["analytics:dashboard:read", "analytics:operations:read", "analytics:financial:read"],
    stats: [
      { label: "Orders", key: "dispatchOrders" },
      { label: "Batches", key: "productionBatches" },
    ],
  },
  {
    title: "Reports",
    description: "Saved operational and management reports.",
    href: "/reports",
    icon: ClipboardList,
    permissions: ["reports:report:read"],
    stats: [
      { label: "Branches", key: "branchCount" },
      { label: "Departments", key: "departmentCount" },
    ],
  },
];

const ACTIONS: ActionConfig[] = [
  {
    title: "Review approvals",
    description: "Open pending approvals.",
    href: "/approvals",
    icon: CheckCircle2,
    permissions: ["approvals:request:read", "approvals:request:approve"],
  },
  {
    title: "Receive goods",
    description: "Create a goods receipt.",
    href: "/warehouse/grn/new",
    icon: PackageCheck,
    permissions: ["warehouse:grn:create"],
  },
  {
    title: "Plan a trip",
    description: "Create a transport trip.",
    href: "/transport/trips/new",
    icon: Truck,
    permissions: ["transport:trip:create"],
  },
  {
    title: "Open work order",
    description: "Create maintenance work.",
    href: "/maintenance/work-orders/new",
    icon: Wrench,
    permissions: ["maintenance:workorder:create"],
  },
  {
    title: "Purchase request",
    description: "Request materials or services.",
    href: "/procurement/requests/new",
    icon: ShoppingCart,
    permissions: ["procurement:request:create"],
  },
  {
    title: "Start lab test",
    description: "Create a QC test.",
    href: "/qc/tests/new",
    icon: FileSearch,
    permissions: ["qc:test:create"],
  },
  {
    title: "New dispatch order",
    description: "Prepare customer delivery.",
    href: "/dispatch/orders/new",
    icon: SendHorizonal,
    permissions: ["dispatch:order:create"],
  },
  {
    title: "Schedule production",
    description: "Create a batch plan.",
    href: "/production/batches/new",
    icon: Factory,
    permissions: ["production:batch:create"],
  },
  {
    title: "Journal entry",
    description: "Record a finance entry.",
    href: "/finance/journal-entries/new",
    icon: Landmark,
    permissions: ["finance:journal:create"],
  },
  {
    title: "Record payment",
    description: "Create a payment record.",
    href: "/finance/payments/new",
    icon: Receipt,
    permissions: ["finance:payment:create"],
  },
];

function hasAccess(user: AuthUser | null, permissions: string[]) {
  if (!user) return false;
  if (user.permissions.includes("*")) return true;
  return permissions.some((permission) => user.permissions.includes(permission));
}

function getRoleProfile(user: AuthUser | null): RoleProfile {
  if (!user) return DEFAULT_PROFILE;
  const roleOrder = ["SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER", "DEPT_HEAD", "MANAGEMENT", "AUDITOR"];
  const role = roleOrder.find((code) => user.roles.includes(code));
  return role ? ROLE_PROFILES[role] : DEFAULT_PROFILE;
}

function formatRole(code: string) {
  return code
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function MetricCard({ metric, value }: { metric: MetricConfig; value: number }) {
  const Icon = metric.icon;

  return (
    <Link href={metric.href} className="group block">
      <Card className={cn("h-full border-l-4 transition-all hover:-translate-y-0.5 hover:shadow-md", metric.accent)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-foreground">{metric.title}</CardTitle>
          <span className="rounded-md bg-background/80 p-2 shadow-sm">
            <Icon className="h-4 w-4" />
          </span>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-3xl font-bold tracking-tight text-foreground">{formatNumber(value)}</div>
              <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ModuleCard({ module, stats }: { module: ModuleConfig; stats: DashboardStats }) {
  const Icon = module.icon;

  return (
    <Link href={module.href} className="group block">
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <span className="rounded-md bg-muted p-2 text-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div>
            <CardTitle className="text-base">{module.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">{module.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {module.stats.map((item) => (
              <div key={item.label} className="rounded-md border bg-muted/40 p-3">
                <div className="text-lg font-semibold leading-none">{formatNumber(stats[item.key])}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActionLink({ action }: { action: ActionConfig }) {
  const Icon = action.icon;

  return (
    <Button asChild variant="outline" className="h-auto justify-start rounded-lg p-3 text-left">
      <Link href={action.href}>
        <Icon className="mr-3 h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{action.title}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{action.description}</span>
        </span>
      </Link>
    </Button>
  );
}

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((response) => response.json())
      .then((payload) => setStats({ ...EMPTY_STATS, ...payload.data }))
      .catch(() => setStats(EMPTY_STATS))
      .finally(() => setLoading(false));
  }, []);

  const profile = useMemo(() => getRoleProfile(user), [user]);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const visibleMetrics = useMemo(() => {
    const allowed = METRICS.filter((metric) => hasAccess(user, metric.permissions));
    const sorted = [...allowed].sort((a, b) => {
      const aRank = profile.priority.indexOf(a.key);
      const bRank = profile.priority.indexOf(b.key);
      return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
    });
    return sorted.slice(0, 4);
  }, [profile, user]);

  const visibleModules = useMemo(
    () => MODULES.filter((module) => hasAccess(user, module.permissions)).slice(0, 6),
    [user]
  );

  const visibleActions = useMemo(
    () => ACTIONS.filter((action) => hasAccess(user, action.permissions)).slice(0, 5),
    [user]
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className={cn("h-1.5 bg-gradient-to-r", profile.accent)} />
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-6">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-md">
                <Sparkles className="mr-1.5 h-3 w-3" />
                {profile.eyebrow}
              </Badge>
              {user?.roles.map((role) => (
                <Badge key={role} variant="outline" className="rounded-md">
                  {formatRole(role)}
                </Badge>
              ))}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {greeting}, {user?.fullName?.split(" ")[0] ?? "there"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{profile.summary}</p>
          </div>
          <div className="grid min-w-52 gap-3 rounded-lg border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Today
            </div>
            <div className="text-sm text-muted-foreground">{formatDateTime(new Date())}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4 text-emerald-600" />
              {profile.title}
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {visibleMetrics.length > 0 && (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {visibleMetrics.map((metric) => (
                <MetricCard key={metric.key} metric={metric} value={stats[metric.key]} />
              ))}
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <LayoutDashboard className="h-5 w-5 text-primary" />
                      Your Modules
                    </CardTitle>
                    <CardDescription>Visible modules are based on your current role access.</CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-md">
                    {visibleModules.length} available
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {visibleModules.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {visibleModules.map((module) => (
                      <ModuleCard key={module.title} module={module} stats={stats} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">No dashboard modules assigned yet.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ask an administrator to assign a role with module permissions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Shortcuts matched to your permissions.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {visibleActions.length > 0 ? (
                    visibleActions.map((action) => <ActionLink key={action.title} action={action} />)
                  ) : (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      You have read-only access right now.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GitBranch className="h-5 w-5 text-primary" />
                    Operating Footprint
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-md bg-muted/60 p-3">
                    <span className="text-sm text-muted-foreground">Branches</span>
                    <span className="font-semibold">{formatNumber(stats.branchCount)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-muted/60 p-3">
                    <span className="text-sm text-muted-foreground">Departments</span>
                    <span className="font-semibold">{formatNumber(stats.departmentCount)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-muted/60 p-3">
                    <span className="text-sm text-muted-foreground">Active employees</span>
                    <span className="font-semibold">{formatNumber(stats.employeeCount)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
