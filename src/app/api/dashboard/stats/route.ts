import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { success, serverError } from "@/lib/response";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import type { AuthUser } from "@/types/auth";

const DASHBOARD_STAT_KEYS = [
  "userCount",
  "employeeCount",
  "branchCount",
  "departmentCount",
  "roleCount",
  "pendingApprovals",
  "warehouseCount",
  "lowStockItems",
  "activeVehicles",
  "activeDrivers",
  "activeTrips",
  "openIncidents",
  "activeFuelTanks",
  "openWorkOrders",
  "pendingPurchaseRequests",
  "openPurchaseOrders",
  "activeProductionBatches",
  "openQualityIssues",
  "pendingDispatchOrders",
  "auditLogCount",
] as const;

type DashboardStatKey = (typeof DASHBOARD_STAT_KEYS)[number];
type DashboardStats = Record<DashboardStatKey, number>;

const EMPTY_STATS = DASHBOARD_STAT_KEYS.reduce((stats, key) => {
  stats[key] = 0;
  return stats;
}, {} as DashboardStats);

const STAT_QUERIES: Record<
  DashboardStatKey,
  { permission: string; count: () => Promise<number> }
> = {
  userCount: {
    permission: "users:user:read",
    count: () => db.user.count({ where: { isActive: true } }),
  },
  employeeCount: {
    permission: "employees:employee:read",
    count: () => db.employee.count({ where: { status: "ACTIVE" } }),
  },
  branchCount: {
    permission: "company:branch:read",
    count: () => db.branch.count({ where: { isActive: true } }),
  },
  departmentCount: {
    permission: "company:department:read",
    count: () => db.department.count({ where: { isActive: true } }),
  },
  roleCount: {
    permission: "roles:role:read",
    count: () => db.role.count({ where: { isActive: true } }),
  },
  pendingApprovals: {
    permission: "approvals:request:read",
    count: () => db.approvalRequest.count({ where: { status: "PENDING" } }),
  },
  warehouseCount: {
    permission: "warehouse:warehouse:read",
    count: () => db.warehouse.count({ where: { isActive: true } }),
  },
  lowStockItems: {
    permission: "warehouse:stock:read",
    count: () => db.stockBalance.count({ where: { quantity: { lte: 0 } } }),
  },
  activeVehicles: {
    permission: "transport:vehicle:read",
    count: () => db.vehicle.count({ where: { isActive: true } }),
  },
  activeDrivers: {
    permission: "transport:driver:read",
    count: () => db.driver.count({ where: { status: "ACTIVE" } }),
  },
  activeTrips: {
    permission: "transport:trip:read",
    count: () =>
      db.tripOrder.count({
        where: { status: { in: ["PLANNED", "DISPATCHED", "IN_TRANSIT"] } },
      }),
  },
  openIncidents: {
    permission: "transport:incident:read",
    count: () =>
      db.vehicleIncident.count({
        where: { status: { notIn: ["CLOSED", "RESOLVED"] } },
      }),
  },
  activeFuelTanks: {
    permission: "fuel:tank:read",
    count: () => db.fuelTank.count({ where: { isActive: true } }),
  },
  openWorkOrders: {
    permission: "maintenance:workorder:read",
    count: () =>
      db.workOrder.count({
        where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
      }),
  },
  pendingPurchaseRequests: {
    permission: "procurement:request:read",
    count: () =>
      db.purchaseRequest.count({
        where: { status: { in: ["DRAFT", "SUBMITTED", "PENDING"] } },
      }),
  },
  openPurchaseOrders: {
    permission: "procurement:order:read",
    count: () =>
      db.purchaseOrder.count({
        where: { status: { notIn: ["RECEIVED", "CANCELLED", "CLOSED"] } },
      }),
  },
  activeProductionBatches: {
    permission: "production:batch:read",
    count: () =>
      db.productionBatch.count({
        where: { status: { in: ["PLANNED", "IN_PROGRESS"] } },
      }),
  },
  openQualityIssues: {
    permission: "qc:ncr:read",
    count: () =>
      db.nonConformance.count({
        where: { status: { notIn: ["CLOSED", "RESOLVED"] } },
      }),
  },
  pendingDispatchOrders: {
    permission: "dispatch:order:read",
    count: () =>
      db.dispatchOrder.count({
        where: { status: { in: ["DRAFT", "CONFIRMED", "DISPATCHED"] } },
      }),
  },
  auditLogCount: {
    permission: "audit:log:read",
    count: () => db.auditLog.count(),
  },
};

const STAT_KEY_SET = new Set<string>(DASHBOARD_STAT_KEYS);

function getRequestedStatKeys(request: NextRequest): DashboardStatKey[] {
  const metrics = request.nextUrl.searchParams.get("metrics");
  if (!metrics) return [...DASHBOARD_STAT_KEYS];

  const requested = metrics
    .split(",")
    .map((metric) => metric.trim())
    .filter((metric): metric is DashboardStatKey => STAT_KEY_SET.has(metric));

  return Array.from(new Set(requested));
}

async function countIfAllowed(user: AuthUser, statKey: DashboardStatKey) {
  const query = STAT_QUERIES[statKey];
  if (!hasPermission(user, query.permission)) return 0;
  return query.count();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user } = auth;
  const requestedStatKeys = getRequestedStatKeys(request);

  try {
    const entries = await Promise.all(
      requestedStatKeys.map(async (statKey) => [
        statKey,
        await countIfAllowed(user, statKey),
      ] as const),
    );

    return success({ ...EMPTY_STATS, ...Object.fromEntries(entries) });
  } catch (err) {
    console.error("[dashboard/stats] Failed to load dashboard stats", err);
    return serverError();
  }
}
