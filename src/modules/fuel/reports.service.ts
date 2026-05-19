import { db } from "@/lib/db";

export async function getConsumptionByVehicle(
  params: {
    from?: string;
    to?: string;
    vehicleId?: string;
  }
) {
  const { from, to, vehicleId } = params;

  const where = {
    ...(vehicleId ? { vehicleId } : {}),
    ...(from || to
      ? {
          issuedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const issues = await db.fuelIssue.findMany({
    where,
    include: {
      vehicle: {
        select: { id: true, plateNumber: true, make: true, model: true },
      },
    },
  });

  // Group by vehicleId in TypeScript
  const grouped = new Map<
    string,
    {
      vehicleId: string;
      plateNumber: string;
      make: string;
      model: string;
      totalLiters: number;
      totalCost: number;
      issueCount: number;
    }
  >();

  for (const issue of issues) {
    const existing = grouped.get(issue.vehicleId);
    if (existing) {
      existing.totalLiters += issue.quantityLiters;
      existing.totalCost += issue.totalCost ?? 0;
      existing.issueCount += 1;
    } else {
      grouped.set(issue.vehicleId, {
        vehicleId: issue.vehicleId,
        plateNumber: issue.vehicle.plateNumber,
        make: issue.vehicle.make,
        model: issue.vehicle.model,
        totalLiters: issue.quantityLiters,
        totalCost: issue.totalCost ?? 0,
        issueCount: 1,
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => b.totalLiters - a.totalLiters);
}

function getPeriodKey(date: Date, groupBy: "day" | "week" | "month"): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (groupBy === "day") {
    return `${year}-${month}-${day}`;
  }
  if (groupBy === "month") {
    return `${year}-${month}`;
  }
  // week: ISO week key — year + week number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export async function getConsumptionByPeriod(
  params: {
    groupBy: "day" | "week" | "month";
    from?: string;
    to?: string;
    tankId?: string;
  }
) {
  const { groupBy, from, to, tankId } = params;

  const where = {
    ...(tankId ? { tankId } : {}),
    ...(from || to
      ? {
          issuedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const issues = await db.fuelIssue.findMany({
    where,
    select: {
      issuedAt: true,
      quantityLiters: true,
      totalCost: true,
    },
    orderBy: { issuedAt: "asc" },
  });

  // Group in TypeScript
  const grouped = new Map<
    string,
    { period: string; totalLiters: number; totalCost: number; issueCount: number }
  >();

  for (const issue of issues) {
    const period = getPeriodKey(issue.issuedAt, groupBy);
    const existing = grouped.get(period);
    if (existing) {
      existing.totalLiters += issue.quantityLiters;
      existing.totalCost += issue.totalCost ?? 0;
      existing.issueCount += 1;
    } else {
      grouped.set(period, {
        period,
        totalLiters: issue.quantityLiters,
        totalCost: issue.totalCost ?? 0,
        issueCount: 1,
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.period.localeCompare(b.period));
}

export async function getTankLevelHistory(
  tankId: string,
  params: {
    from?: string;
    to?: string;
  }
) {
  const { from, to } = params;

  const dateFilter = from || to
    ? {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    : undefined;

  const [tank, receipts, issues] = await Promise.all([
    db.fuelTank.findUnique({
      where: { id: tankId },
      select: { id: true, companyId: true, name: true, code: true, fuelType: true, capacity: true, currentLevel: true },
    }),
    db.fuelReceipt.findMany({
      where: {
        tankId,
        status: "CONFIRMED",
        ...(dateFilter ? { confirmedAt: dateFilter } : {}),
      },
      select: {
        id: true,
        reference: true,
        quantityLiters: true,
        confirmedAt: true,
        supplierName: true,
      },
      orderBy: { confirmedAt: "asc" },
    }),
    db.fuelIssue.findMany({
      where: {
        tankId,
        ...(dateFilter ? { issuedAt: dateFilter } : {}),
      },
      select: {
        id: true,
        reference: true,
        quantityLiters: true,
        issuedAt: true,
        vehicle: { select: { plateNumber: true } },
      },
      orderBy: { issuedAt: "asc" },
    }),
  ]);

  if (!tank) return null;

  // Build chronological event list
  type HistoryEvent = {
    date: Date;
    type: "RECEIPT" | "ISSUE";
    id: string;
    reference: string;
    quantityLiters: number;
    description: string;
    balanceAfter: number;
  };

  const events: Omit<HistoryEvent, "balanceAfter">[] = [];

  for (const r of receipts) {
    if (!r.confirmedAt) continue;
    events.push({
      date: r.confirmedAt,
      type: "RECEIPT",
      id: r.id,
      reference: r.reference,
      quantityLiters: r.quantityLiters,
      description: `Fuel receipt from ${r.supplierName ?? "supplier"}`,
    });
  }

  for (const i of issues) {
    events.push({
      date: i.issuedAt,
      type: "ISSUE",
      id: i.id,
      reference: i.reference,
      quantityLiters: i.quantityLiters,
      description: `Fuel issued to vehicle ${i.vehicle.plateNumber}`,
    });
  }

  // Sort by date ascending
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Compute running balance
  // Start from current level by working backwards — or just track forward from 0 if no starting snapshot
  // We reconstruct forward: begin at a notional starting balance by reversing the events from currentLevel
  let runningBalance = tank.currentLevel;

  // Walk backwards to find starting balance
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === "RECEIPT") {
      runningBalance -= events[i].quantityLiters;
    } else {
      runningBalance += events[i].quantityLiters;
    }
  }

  const history: HistoryEvent[] = [];
  for (const event of events) {
    if (event.type === "RECEIPT") {
      runningBalance = Math.min(runningBalance + event.quantityLiters, tank.capacity);
    } else {
      runningBalance = Math.max(0, runningBalance - event.quantityLiters);
    }
    history.push({ ...event, balanceAfter: runningBalance });
  }

  return { tank, history };
}
