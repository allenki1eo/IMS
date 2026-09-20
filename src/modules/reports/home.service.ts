/**
 * Director + Ops home tiles — sparse decision surface for Reports & Analytics MVP.
 * Spend today uses the shared finance metric (same definition as EOD SMS).
 */
import { db } from "@/lib/db";
import { todayCalendarDate } from "@/lib/timezone";
import {
  eatDayBounds,
  getSpendToday,
  computeCashInByCompany,
} from "@/modules/finance/spend-today.service";
import { getDaystorePlan } from "@/modules/production/daystore.service";

export type LineFamilyFilter = "BREWING" | "SPIRITS" | "ALL";

export type HomeTile = {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
  href: string;
  tone?: "default" | "warning" | "danger" | "ok";
};

export type ShortageRow = {
  description: string;
  requiredQty: number;
  availableQty: number | null;
  availableLabel: string;
  uom: string;
  status: "SHORTAGE" | "NOT_LINKED";
};

export type DirectorHome = {
  view: "director";
  calendarDate: string;
  hero: HomeTile;
  tiles: HomeTile[];
};

export type OpsHome = {
  view: "ops";
  calendarDate: string;
  companyId: string;
  lineFamily: LineFamilyFilter;
  tiles: HomeTile[];
  shortageRows: ShortageRow[];
};

export function normalizeLineFamily(raw?: string | null): LineFamilyFilter {
  const v = (raw ?? "ALL").toUpperCase();
  if (v === "BREWING" || v === "SPIRITS") return v;
  return "ALL";
}

async function countStockRisk(companyId?: string): Promise<number> {
  const items = await db.item.findMany({
    where: {
      isActive: true,
      minStock: { gt: 0 },
      ...(companyId ? { companyId } : {}),
    },
    select: {
      id: true,
      minStock: true,
      stockBalances: { select: { quantity: true } },
    },
  });
  return items.filter((item) => {
    const qty = item.stockBalances.reduce((s, b) => s + (b.quantity ?? 0), 0);
    return qty <= item.minStock;
  }).length;
}

async function countQcHolds(companyId?: string): Promise<number> {
  return db.fGLot.count({
    where: {
      qaStatus: { in: ["HOLD", "PENDING"] },
      ...(companyId ? { companyId } : {}),
    },
  });
}

async function countOpenDispatches(
  calendarDate: string,
  companyId?: string
): Promise<number> {
  const { start, end } = eatDayBounds(calendarDate);
  return db.dispatchOrder.count({
    where: {
      ...(companyId ? { companyId } : {}),
      OR: [
        { status: "DRAFT" },
        {
          status: { in: ["DRAFT", "CONFIRMED"] },
          scheduledDate: { gte: start, lte: end },
        },
      ],
    },
  });
}

async function countDispatchesToday(
  calendarDate: string,
  companyId: string
): Promise<number> {
  const { start, end } = eatDayBounds(calendarDate);
  return db.dispatchOrder.count({
    where: {
      companyId,
      OR: [
        { status: "DRAFT", lines: { some: {} } },
        { scheduledDate: { gte: start, lte: end } },
      ],
    },
  });
}

async function countBatchesInProgress(
  companyId: string,
  lineFamily: LineFamilyFilter
): Promise<number> {
  return db.productionBatch.count({
    where: {
      companyId,
      status: "IN_PROGRESS",
      ...(lineFamily === "ALL" ? {} : { batchType: lineFamily }),
    },
  });
}

async function countQcPending(companyId: string): Promise<number> {
  return db.fGLot.count({
    where: { companyId, qaStatus: "PENDING" },
  });
}

async function getShortageSummary(
  companyId: string,
  calendarDate: string
): Promise<{ shortageCount: number; notLinkedCount: number; rows: ShortageRow[] }> {
  const noonUtc = new Date(`${calendarDate}T12:00:00.000Z`);
  const plan = await getDaystorePlan(companyId, noonUtc);
  const shortages = plan.materials.filter((m) => m.status === "SHORTAGE");
  const notLinked = plan.materials.filter((m) => m.status === "UNKNOWN");
  return {
    shortageCount: shortages.length,
    notLinkedCount: notLinked.length,
    rows: plan.materials
      .filter((m) => m.status === "SHORTAGE" || m.status === "UNKNOWN")
      .slice(0, 8)
      .map((m) => ({
        description: m.description,
        requiredQty: m.requiredQty,
        availableQty: m.status === "UNKNOWN" ? null : m.daystoreStock,
        availableLabel:
          m.status === "UNKNOWN" ? "Not linked to stock" : String(m.daystoreStock),
        uom: m.uom,
        status: (m.status === "UNKNOWN" ? "NOT_LINKED" : "SHORTAGE") as
          | "SHORTAGE"
          | "NOT_LINKED",
      })),
  };
}

export async function getDirectorHome(): Promise<DirectorHome> {
  const calendarDate = todayCalendarDate();
  const [spend, cashInLines, stockRisk, qcHolds, openDispatches] =
    await Promise.all([
      getSpendToday({ calendarDate }),
      computeCashInByCompany(calendarDate),
      countStockRisk(),
      countQcHolds(),
      countOpenDispatches(calendarDate),
    ]);
  const cashIn = cashInLines.reduce((s, l) => s + l.spend, 0);

  return {
    view: "director",
    calendarDate,
    hero: {
      key: "spendToday",
      label: "Spend today",
      value: spend.total,
      hint: "All companies · matches EOD SMS",
      href: "/finance/cashbook/director",
      tone: spend.total > 0 ? "warning" : "ok",
    },
    tiles: [
      {
        key: "cashInToday",
        label: "Cash / bank in today",
        value: cashIn,
        href: "/finance/cashbook",
        tone: "default",
      },
      {
        key: "stockRisk",
        label: "Stock risk",
        value: stockRisk,
        hint: "Below min stock",
        href: "/warehouse/stock",
        tone: stockRisk > 0 ? "danger" : "ok",
      },
      {
        key: "qcHolds",
        label: "QC holds",
        value: qcHolds,
        hint: "HOLD + PENDING lots",
        href: "/dispatch/inventory",
        tone: qcHolds > 0 ? "warning" : "ok",
      },
      {
        key: "openDispatches",
        label: "Open dispatches",
        value: openDispatches,
        hint: "DRAFT or scheduled today",
        href: "/dispatch/orders",
        tone: openDispatches > 0 ? "warning" : "ok",
      },
    ],
  };
}

export async function getOpsHome(
  companyId: string,
  lineFamilyRaw?: string | null
): Promise<OpsHome> {
  const calendarDate = todayCalendarDate();
  const lineFamily = normalizeLineFamily(lineFamilyRaw);

  const [spend, shortage, batches, qcPending, dispatches] = await Promise.all([
    getSpendToday({ calendarDate, companyId }),
    getShortageSummary(companyId, calendarDate),
    countBatchesInProgress(companyId, lineFamily),
    countQcPending(companyId),
    countDispatchesToday(calendarDate, companyId),
  ]);

  const shortageTotal = shortage.shortageCount + shortage.notLinkedCount;
  const shortageHint =
    shortage.notLinkedCount > 0
      ? `${shortage.shortageCount} short · ${shortage.notLinkedCount} not linked`
      : `${shortage.shortageCount} short`;

  return {
    view: "ops",
    calendarDate,
    companyId,
    lineFamily,
    shortageRows: shortage.rows,
    tiles: [
      {
        key: "spendToday",
        label: "Spend today",
        value: spend.companySpend,
        hint: "This company · same definition as EOD SMS",
        href: "/finance/cashbook",
        tone: spend.companySpend > 0 ? "warning" : "ok",
      },
      {
        key: "shortages",
        label: "Shortages",
        value: shortageTotal,
        hint: shortageHint,
        href: "/production/daystore",
        tone: shortageTotal > 0 ? "danger" : "ok",
      },
      {
        key: "batchesInProgress",
        label: "Batches in progress",
        value: batches,
        hint: lineFamily === "ALL" ? "All lines" : lineFamily,
        href: "/production/batches",
        tone: "default",
      },
      {
        key: "qcPending",
        label: "QC pending release",
        value: qcPending,
        href: "/dispatch/inventory",
        tone: qcPending > 0 ? "warning" : "ok",
      },
      {
        key: "dispatchesToday",
        label: "Dispatches to run today",
        value: dispatches,
        href: "/dispatch/orders",
        tone: dispatches > 0 ? "warning" : "ok",
      },
    ],
  };
}
