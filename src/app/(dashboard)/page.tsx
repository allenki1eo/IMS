"use client";
import Link from "next/link";
import { useEffect, useState, type ElementType } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle,
  ClipboardList,
  Factory,
  GitBranch,
  Package,
  ScrollText,
  Shield,
  Sparkles,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types/auth";

interface DashboardStats {
  userCount: number;
  employeeCount: number;
  branchCount: number;
  departmentCount: number;
  roleCount: number;
  pendingApprovals: number;
  warehouseCount: number;
  lowStockItems: number;
  activeVehicles: number;
  activeDrivers: number;
  activeTrips: number;
  openIncidents: number;
  activeFuelTanks: number;
  openWorkOrders: number;
  pendingPurchaseRequests: number;
  openPurchaseOrders: number;
  activeProductionBatches: number;
  openQualityIssues: number;
  pendingDispatchOrders: number;
  auditLogCount: number;
}

type StatKey = keyof DashboardStats;

type RoleKey =
  | "SUPER_ADMIN"
  | "COMPANY_ADMIN"
  | "BRANCH_MANAGER"
  | "DEPT_HEAD"
  | "MANAGEMENT"
  | "AUDITOR"
  | "TEAM_MEMBER";

interface StatDefinition {
  title: string;
  stat: StatKey;
  icon: ElementType;
  description: string;
  permission?: string;
  tone: string;
}

interface QuickAction {
  label: string;
  href: string;
  description: string;
  permission?: string;
}

interface RoleDashboardConfig {
  label: string;
  eyebrow: string;
  summary: string;
  focus: string[];
  stats: StatDefinition[];
  actions: QuickAction[];
}

const ROLE_PRIORITY: RoleKey[] = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "BRANCH_MANAGER",
  "DEPT_HEAD",
  "MANAGEMENT",
  "AUDITOR",
  "TEAM_MEMBER",
];

const BASE_STATS: StatDefinition[] = [
  {
    title: "Pending Approvals",
    stat: "pendingApprovals",
    icon: CheckCircle,
    description: "Awaiting review",
    permission: "approvals:request:read",
    tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-700",
  },
  {
    title: "Active Employees",
    stat: "employeeCount",
    icon: UserCheck,
    description: "People on record",
    permission: "employees:employee:read",
    tone: "from-blue-500/15 to-blue-500/5 text-blue-700",
  },
  {
    title: "Open Work Orders",
    stat: "openWorkOrders",
    icon: Wrench,
    description: "Maintenance queue",
    permission: "maintenance:workorder:read",
    tone: "from-orange-500/15 to-orange-500/5 text-orange-700",
  },
  {
    title: "Active Trips",
    stat: "activeTrips",
    icon: Truck,
    description: "Planned or in transit",
    permission: "transport:trip:read",
    tone: "from-indigo-500/15 to-indigo-500/5 text-indigo-700",
  },
];

const ROLE_DASHBOARDS: Record<RoleKey, RoleDashboardConfig> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    eyebrow: "System command center",
    summary:
      "Full-stack oversight for access, setup, security, and every operational module.",
    focus: [
      "Security posture",
      "User provisioning",
      "Company setup",
      "Audit readiness",
    ],
    stats: [
      {
        title: "Active Users",
        stat: "userCount",
        icon: Users,
        description: "Enabled accounts",
        permission: "users:user:read",
        tone: "from-violet-500/15 to-violet-500/5 text-violet-700",
      },
      {
        title: "Roles",
        stat: "roleCount",
        icon: Shield,
        description: "Permission groups",
        permission: "roles:role:read",
        tone: "from-sky-500/15 to-sky-500/5 text-sky-700",
      },
      {
        title: "Branches",
        stat: "branchCount",
        icon: GitBranch,
        description: "Operating locations",
        permission: "company:branch:read",
        tone: "from-cyan-500/15 to-cyan-500/5 text-cyan-700",
      },
      {
        title: "Audit Events",
        stat: "auditLogCount",
        icon: ScrollText,
        description: "Logged activities",
        permission: "audit:log:read",
        tone: "from-slate-500/15 to-slate-500/5 text-slate-700",
      },
    ],
    actions: [
      {
        label: "Create user",
        href: "/admin/users/new",
        description: "Provision a new ERP account",
        permission: "users:user:create",
      },
      {
        label: "Manage roles",
        href: "/admin/roles",
        description: "Review access groups",
        permission: "roles:role:read",
      },
      {
        label: "View audit logs",
        href: "/audit-logs",
        description: "Trace system activity",
        permission: "audit:log:read",
      },
    ],
  },
  COMPANY_ADMIN: {
    label: "Company Admin",
    eyebrow: "Organization operations",
    summary:
      "A company-wide dashboard for structure, people, approvals, and shared configuration.",
    focus: [
      "Company profile",
      "Branch coverage",
      "People operations",
      "Approval flow",
    ],
    stats: [
      {
        title: "Employees",
        stat: "employeeCount",
        icon: UserCheck,
        description: "Active workforce",
        permission: "employees:employee:read",
        tone: "from-blue-500/15 to-blue-500/5 text-blue-700",
      },
      {
        title: "Departments",
        stat: "departmentCount",
        icon: Building2,
        description: "Active departments",
        permission: "company:department:read",
        tone: "from-teal-500/15 to-teal-500/5 text-teal-700",
      },
      {
        title: "Branches",
        stat: "branchCount",
        icon: GitBranch,
        description: "Company locations",
        permission: "company:branch:read",
        tone: "from-cyan-500/15 to-cyan-500/5 text-cyan-700",
      },
      {
        title: "Approvals",
        stat: "pendingApprovals",
        icon: CheckCircle,
        description: "Pending decisions",
        permission: "approvals:request:read",
        tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-700",
      },
    ],
    actions: [
      {
        label: "Company profile",
        href: "/company",
        description: "Update organization details",
        permission: "company:company:read",
      },
      {
        label: "Departments",
        href: "/company/departments",
        description: "Manage reporting lines",
        permission: "company:department:read",
      },
      {
        label: "Approvals",
        href: "/approvals",
        description: "Clear pending workflows",
        permission: "approvals:request:read",
      },
    ],
  },
  BRANCH_MANAGER: {
    label: "Branch Manager",
    eyebrow: "Branch execution hub",
    summary:
      "A daily operating view for warehouse movement, transport, fuel, maintenance, and local approvals.",
    focus: [
      "Warehouse flow",
      "Fleet readiness",
      "Fuel control",
      "Maintenance exceptions",
    ],
    stats: [
      {
        title: "Warehouses",
        stat: "warehouseCount",
        icon: Warehouse,
        description: "Active storage points",
        permission: "warehouse:warehouse:read",
        tone: "from-amber-500/15 to-amber-500/5 text-amber-700",
      },
      {
        title: "Active Vehicles",
        stat: "activeVehicles",
        icon: Truck,
        description: "Fleet available",
        permission: "transport:vehicle:read",
        tone: "from-indigo-500/15 to-indigo-500/5 text-indigo-700",
      },
      {
        title: "Fuel Tanks",
        stat: "activeFuelTanks",
        icon: BarChart3,
        description: "Active tanks",
        permission: "fuel:tank:read",
        tone: "from-lime-500/15 to-lime-500/5 text-lime-700",
      },
      {
        title: "Open Work Orders",
        stat: "openWorkOrders",
        icon: Wrench,
        description: "Maintenance queue",
        permission: "maintenance:workorder:read",
        tone: "from-orange-500/15 to-orange-500/5 text-orange-700",
      },
    ],
    actions: [
      {
        label: "Stock levels",
        href: "/warehouse/stock",
        description: "Check inventory health",
        permission: "warehouse:stock:read",
      },
      {
        label: "Trips",
        href: "/transport/trips",
        description: "Track active transport",
        permission: "transport:trip:read",
      },
      {
        label: "Fuel reports",
        href: "/fuel/reports",
        description: "Review fuel usage",
        permission: "fuel:report:read",
      },
    ],
  },
  DEPT_HEAD: {
    label: "Department Head",
    eyebrow: "Team productivity desk",
    summary:
      "A focused view for department requests, approvals, procurement, and operational follow-up.",
    focus: [
      "Team requests",
      "Approval turn-around",
      "Purchase readiness",
      "Issue follow-up",
    ],
    stats: [
      {
        title: "Purchase Requests",
        stat: "pendingPurchaseRequests",
        icon: ClipboardList,
        description: "Draft/submitted",
        permission: "procurement:request:read",
        tone: "from-purple-500/15 to-purple-500/5 text-purple-700",
      },
      {
        title: "Approvals",
        stat: "pendingApprovals",
        icon: CheckCircle,
        description: "Need attention",
        permission: "approvals:request:read",
        tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-700",
      },
      {
        title: "Employees",
        stat: "employeeCount",
        icon: UserCheck,
        description: "Active people",
        permission: "employees:employee:read",
        tone: "from-blue-500/15 to-blue-500/5 text-blue-700",
      },
      {
        title: "Quality Issues",
        stat: "openQualityIssues",
        icon: AlertTriangle,
        description: "Open NCRs",
        permission: "qc:ncr:read",
        tone: "from-red-500/15 to-red-500/5 text-red-700",
      },
    ],
    actions: [
      {
        label: "New request",
        href: "/procurement/requests/new",
        description: "Start a purchase request",
        permission: "procurement:request:create",
      },
      {
        label: "My approvals",
        href: "/approvals",
        description: "Review pending items",
        permission: "approvals:request:read",
      },
      {
        label: "Employees",
        href: "/employees",
        description: "Review team records",
        permission: "employees:employee:read",
      },
    ],
  },
  MANAGEMENT: {
    label: "Management",
    eyebrow: "Executive snapshot",
    summary:
      "A compact leadership view of operational volume, exceptions, and throughput across modules.",
    focus: [
      "Operational exceptions",
      "Production flow",
      "Dispatch readiness",
      "Procurement exposure",
    ],
    stats: [
      {
        title: "Production Batches",
        stat: "activeProductionBatches",
        icon: Factory,
        description: "Planned/in progress",
        permission: "production:batch:read",
        tone: "from-fuchsia-500/15 to-fuchsia-500/5 text-fuchsia-700",
      },
      {
        title: "Dispatch Orders",
        stat: "pendingDispatchOrders",
        icon: Package,
        description: "Not yet delivered",
        permission: "dispatch:order:read",
        tone: "from-sky-500/15 to-sky-500/5 text-sky-700",
      },
      {
        title: "Open POs",
        stat: "openPurchaseOrders",
        icon: ClipboardList,
        description: "Procurement exposure",
        permission: "procurement:order:read",
        tone: "from-purple-500/15 to-purple-500/5 text-purple-700",
      },
      {
        title: "Open Incidents",
        stat: "openIncidents",
        icon: AlertTriangle,
        description: "Fleet exceptions",
        permission: "transport:incident:read",
        tone: "from-red-500/15 to-red-500/5 text-red-700",
      },
    ],
    actions: [
      {
        label: "Production",
        href: "/production",
        description: "Review manufacturing status",
        permission: "production:report:read",
      },
      {
        label: "Procurement",
        href: "/procurement",
        description: "Inspect purchasing flow",
        permission: "procurement:report:read",
      },
      {
        label: "Dispatch",
        href: "/dispatch",
        description: "Monitor deliveries",
        permission: "dispatch:order:read",
      },
    ],
  },
  AUDITOR: {
    label: "Auditor",
    eyebrow: "Compliance workspace",
    summary:
      "A read-first dashboard for traceability, approvals, user access, and process exceptions.",
    focus: [
      "Audit trail",
      "Approval evidence",
      "Access review",
      "Exception monitoring",
    ],
    stats: [
      {
        title: "Audit Events",
        stat: "auditLogCount",
        icon: ScrollText,
        description: "Activity records",
        permission: "audit:log:read",
        tone: "from-slate-500/15 to-slate-500/5 text-slate-700",
      },
      {
        title: "Approvals",
        stat: "pendingApprovals",
        icon: CheckCircle,
        description: "Open approvals",
        permission: "approvals:request:read",
        tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-700",
      },
      {
        title: "Users",
        stat: "userCount",
        icon: Users,
        description: "Enabled accounts",
        permission: "users:user:read",
        tone: "from-violet-500/15 to-violet-500/5 text-violet-700",
      },
      {
        title: "Quality Issues",
        stat: "openQualityIssues",
        icon: AlertTriangle,
        description: "Open NCRs",
        permission: "qc:ncr:read",
        tone: "from-red-500/15 to-red-500/5 text-red-700",
      },
    ],
    actions: [
      {
        label: "Audit logs",
        href: "/audit-logs",
        description: "Inspect system activity",
        permission: "audit:log:read",
      },
      {
        label: "Users",
        href: "/admin/users",
        description: "Review active accounts",
        permission: "users:user:read",
      },
      {
        label: "Approvals",
        href: "/approvals",
        description: "Check workflow status",
        permission: "approvals:request:read",
      },
    ],
  },
  TEAM_MEMBER: {
    label: "Team Member",
    eyebrow: "My workspace",
    summary:
      "A clean starting point with the modules and actions your account can access today.",
    focus: [
      "Assigned tasks",
      "Pending approvals",
      "Operational updates",
      "Self-service",
    ],
    stats: BASE_STATS,
    actions: [
      {
        label: "Approvals",
        href: "/approvals",
        description: "Review assigned approvals",
        permission: "approvals:request:read",
      },
      {
        label: "Profile",
        href: "/profile",
        description: "Manage your account",
      },
      {
        label: "Settings",
        href: "/settings",
        description: "Open available settings",
        permission: "settings:settings:read",
      },
    ],
  },
};

const ALL_STATS = Array.from(
  new Map(
    Object.values(ROLE_DASHBOARDS)
      .flatMap((dashboard) => dashboard.stats)
      .map((stat) => [stat.stat, stat]),
  ).values(),
);

function hasPermission(user: AuthUser | null, permission?: string): boolean {
  if (!permission) return true;
  if (!user) return false;
  return (
    user.permissions.includes("*") || user.permissions.includes(permission)
  );
}

function getRoleKey(user: AuthUser | null): RoleKey {
  if (!user) return "TEAM_MEMBER";
  return (
    ROLE_PRIORITY.find((role) => user.roles.includes(role)) ?? "TEAM_MEMBER"
  );
}

function getVisibleItems<T extends { permission?: string }>(
  items: T[],
  user: AuthUser | null,
): T[] {
  return items.filter((item) => hasPermission(user, item.permission));
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  tone,
}: {
  title: string;
  value: number | string;
  icon: ElementType;
  description?: string;
  tone: string;
}) {
  return (
    <Card className="group relative overflow-hidden border-0 bg-card/90 shadow-sm ring-1 ring-border/70 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", tone)}
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("rounded-xl bg-gradient-to-br p-2", tone)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        setStatsError(null);
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok)
          throw new Error(`Dashboard stats request failed: ${response.status}`);

        const payload = await response.json();
        if (!isMounted) return;

        setStats(payload.data);
        setLastUpdated(formatDateTime(new Date()));
      } catch (error) {
        console.error("[dashboard] Failed to load dashboard stats", error);
        if (isMounted)
          setStatsError("We could not load the dashboard numbers right now.");
      } finally {
        if (isMounted) setStatsLoading(false);
      }
    }

    loadStats();

    const currentHour = new Date().getHours();
    setGreeting(
      currentHour < 12
        ? "Good morning"
        : currentHour < 18
          ? "Good afternoon"
          : "Good evening",
    );

    return () => {
      isMounted = false;
    };
  }, []);

  const roleKey = getRoleKey(user);
  const dashboard = ROLE_DASHBOARDS[roleKey];
  const roleStats = getVisibleItems(dashboard.stats, user);
  const fallbackStats = getVisibleItems(ALL_STATS, user).slice(0, 4);
  const visibleStats = roleStats.length > 0 ? roleStats : fallbackStats;
  const visibleActions = getVisibleItems(dashboard.actions, user);
  const showApprovalsLink = hasPermission(user, "approvals:request:read");

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-primary p-6 text-white shadow-xl md:p-8">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-20 h-32 w-32 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.5fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
              <Sparkles className="mr-1 h-3 w-3" /> Phase 1 dashboard
            </Badge>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-white/60">
                {dashboard.eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
                {greeting}, {user?.fullName?.split(" ")[0] ?? "there"}.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
                {dashboard.summary}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/20 bg-white text-slate-900 hover:bg-white">
                {dashboard.label}
              </Badge>
              {user?.roles.slice(0, 3).map((role) => (
                <Badge
                  key={role}
                  className="border-white/20 bg-white/10 text-white hover:bg-white/10"
                >
                  {role.replaceAll("_", " ")}
                </Badge>
              ))}
            </div>
          </div>

          <Card className="border-white/15 bg-white/10 text-white shadow-none backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" /> Today&apos;s focus
              </CardTitle>
              <CardDescription className="text-white/65">
                {lastUpdated || "Loading dashboard status..."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.focus.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2 text-sm"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {statsError && (
        <Card className="border-destructive/40 bg-destructive/5 text-destructive">
          <CardContent className="p-4 text-sm">{statsError}</CardContent>
        </Card>
      )}

      {userLoading || statsLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {visibleStats.map((item) => (
            <StatCard
              key={item.title}
              title={item.title}
              value={stats?.[item.stat] ?? 0}
              icon={item.icon}
              description={item.description}
              tone={item.tone}
            />
          ))}
          {visibleStats.length === 0 && (
            <Card className="border-dashed sm:col-span-2 xl:col-span-4">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No dashboard metrics are available for this role yet. Ask an
                administrator to review your permissions.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/70">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-base">Role workbench</CardTitle>
            <CardDescription>
              Fast paths based on your current role and permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-2xl border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="font-semibold">{action.label}</div>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {action.description}
                </p>
              </Link>
            ))}
            {visibleActions.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No quick actions are available for this role yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-border/70">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Operating pulse
            </CardTitle>
            <CardDescription>
              Key signals from the modules you can access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <PulseRow
              label="Low/empty stock items"
              value={stats?.lowStockItems ?? 0}
              permission="warehouse:stock:read"
              user={user}
            />
            <PulseRow
              label="Open incidents"
              value={stats?.openIncidents ?? 0}
              permission="transport:incident:read"
              user={user}
            />
            <PulseRow
              label="Open purchase orders"
              value={stats?.openPurchaseOrders ?? 0}
              permission="procurement:order:read"
              user={user}
            />
            <PulseRow
              label="Pending dispatch orders"
              value={stats?.pendingDispatchOrders ?? 0}
              permission="dispatch:order:read"
              user={user}
            />
            {showApprovalsLink && (
              <div className="pt-2">
                <Button asChild className="w-full" variant="outline">
                  <Link href="/approvals">Open approvals center</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PulseRow({
  label,
  value,
  permission,
  user,
}: {
  label: string;
  value: number;
  permission: string;
  user: AuthUser | null;
}) {
  if (!hasPermission(user, permission)) return null;

  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
