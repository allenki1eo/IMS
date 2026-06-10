import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function genRef(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// ─── Brewing Sessions (Mashing Sheet) ────────────────────────────────────────

export async function listBrewingSessions(params: {
  companyId: string;
  page: number;
  pageSize: number;
  batchId?: string;
  brand?: string;
}) {
  const { companyId, page, pageSize, batchId, brand } = params;
  const skip = (page - 1) * pageSize;
  const where = {
    companyId,
    ...(batchId ? { batchId } : {}),
    ...(brand ? { brand: { contains: brand } } : {}),
  };
  const [sessions, total] = await Promise.all([
    db.brewingSession.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { brewDate: "desc" },
      include: { batch: { select: { id: true, reference: true, productName: true } } },
    }),
    db.brewingSession.count({ where }),
  ]);
  return { sessions, total };
}

export async function getBrewingSessionById(id: string) {
  return db.brewingSession.findUnique({
    where: { id },
    include: {
      batch: { select: { id: true, reference: true, productName: true } },
      activities: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
    },
  });
}

export async function createBrewingSession(params: {
  companyId: string;
  batchId?: string;
  brewDate: Date;
  brand: string;
  brewNumber?: string;
  activities: Array<{
    section: string;
    activity: string;
    unit?: string;
    target?: string;
    startTime?: string;
    endTime?: string;
    actual?: string;
    reasonOutSpec?: string;
    sortOrder?: number;
  }>;
  notes?: string;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { companyId, batchId, brewDate, brand, brewNumber, activities, notes, createdById, userName, ipAddress, userAgent } = params;
  const reference = genRef("BREW");

  const session = await db.brewingSession.create({
    data: {
      companyId,
      batchId: batchId ?? null,
      reference,
      brewDate,
      brand,
      brewNumber: brewNumber ?? null,
      notes: notes ?? null,
      createdById,
      activities: {
        create: activities.map((a, i) => ({
          section: a.section,
          activity: a.activity,
          unit: a.unit ?? null,
          target: a.target ?? null,
          startTime: a.startTime ?? null,
          endTime: a.endTime ?? null,
          actual: a.actual ?? null,
          reasonOutSpec: a.reasonOutSpec ?? null,
          sortOrder: a.sortOrder ?? i,
        })),
      },
    },
    include: { activities: true },
  });

  await createAuditLog({
    userId: createdById, userName,
    action: "CREATE", module: "brewing", resource: "session",
    recordId: session.id,
    description: `Created brewing session ${reference} for ${brand}`,
    ipAddress, userAgent,
  });

  return session;
}

export async function updateBrewingSession(params: {
  id: string;
  data: {
    brand?: string;
    brewNumber?: string;
    status?: string;
    notes?: string;
    activities?: Array<{
      id?: string;
      section: string;
      activity: string;
      unit?: string;
      target?: string;
      startTime?: string;
      endTime?: string;
      actual?: string;
      reasonOutSpec?: string;
      sortOrder?: number;
    }>;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, data, updatedById, userName, ipAddress, userAgent } = params;

  const { activities, ...fields } = data;

  const session = await db.$transaction(async (tx) => {
    if (activities) {
      await tx.brewingActivity.deleteMany({ where: { sessionId: id } });
    }
    return tx.brewingSession.update({
      where: { id },
      data: {
        ...fields,
        ...(activities
          ? {
              activities: {
                create: activities.map((a, i) => ({
                  section: a.section,
                  activity: a.activity,
                  unit: a.unit ?? null,
                  target: a.target ?? null,
                  startTime: a.startTime ?? null,
                  endTime: a.endTime ?? null,
                  actual: a.actual ?? null,
                  reasonOutSpec: a.reasonOutSpec ?? null,
                  sortOrder: a.sortOrder ?? i,
                })),
              },
            }
          : {}),
      },
      include: { activities: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] } },
    });
  });

  await createAuditLog({
    userId: updatedById, userName,
    action: "UPDATE", module: "brewing", resource: "session",
    recordId: id,
    description: `Updated brewing session ${id}`,
    ipAddress, userAgent,
  });

  return session;
}

// ─── Brew Material Usage ──────────────────────────────────────────────────────

export async function listBrewMaterialUsages(params: {
  companyId: string;
  page: number;
  pageSize: number;
  batchId?: string;
}) {
  const { companyId, page, pageSize, batchId } = params;
  const skip = (page - 1) * pageSize;
  const where = { companyId, ...(batchId ? { batchId } : {}) };
  const [usages, total] = await Promise.all([
    db.brewMaterialUsage.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { brewDate: "desc" },
      include: {
        batch: { select: { id: true, reference: true, productName: true } },
        items: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
      },
    }),
    db.brewMaterialUsage.count({ where }),
  ]);
  return { usages, total };
}

export async function getBrewMaterialUsageById(id: string) {
  return db.brewMaterialUsage.findUnique({
    where: { id },
    include: {
      batch: { select: { id: true, reference: true, productName: true } },
      items: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
    },
  });
}

export async function createBrewMaterialUsage(params: {
  companyId: string;
  batchId?: string;
  brewDate: Date;
  brand: string;
  items: Array<{
    section: string;
    itemName: string;
    uom?: string;
    targetQty?: number;
    actualQty?: number;
    additionalQty?: number;
    recommendedQty?: number;
    notes?: string;
    sortOrder?: number;
  }>;
  notes?: string;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { companyId, batchId, brewDate, brand, items, notes, createdById, userName, ipAddress, userAgent } = params;
  const reference = genRef("MAT");

  const usage = await db.brewMaterialUsage.create({
    data: {
      companyId,
      batchId: batchId ?? null,
      reference,
      brewDate,
      brand,
      notes: notes ?? null,
      createdById,
      items: {
        create: items.map((item, i) => ({
          section: item.section,
          itemName: item.itemName,
          uom: item.uom ?? null,
          targetQty: item.targetQty ?? null,
          actualQty: item.actualQty ?? null,
          additionalQty: item.additionalQty ?? null,
          recommendedQty: item.recommendedQty ?? null,
          notes: item.notes ?? null,
          sortOrder: item.sortOrder ?? i,
        })),
      },
    },
    include: { items: true },
  });

  await createAuditLog({
    userId: createdById, userName,
    action: "CREATE", module: "brewing", resource: "material",
    recordId: usage.id,
    description: `Created material usage ${reference} for ${brand}`,
    ipAddress, userAgent,
  });

  return usage;
}

// ─── CIP Records ─────────────────────────────────────────────────────────────

export const CIP_VESSELS = [
  { value: "WORT_COOLER", label: "Wort Cooler" },
  { value: "TRANSFER_LINE", label: "Transfer Line" },
  { value: "LAUTER_TUN", label: "Lauter Tun" },
  { value: "MASH_TUN", label: "Mash Tun" },
  { value: "HOLDING_TANK", label: "Holding Tank" },
  { value: "WORT_KETTLE", label: "Wort Kettle" },
  { value: "WHIRLPOOL", label: "Whirlpool" },
  { value: "FERMENTER", label: "Fermenter / Unitank" },
  { value: "BBT", label: "Bright Beer Tank (BBT)" },
  { value: "YEAST_PITCHING_LINE", label: "Yeast Pitching Line" },
  { value: "HOSE_PIPE", label: "Hose Pipe" },
];

export async function listCIPRecords(params: {
  companyId: string;
  page: number;
  pageSize: number;
  vessel?: string;
}) {
  const { companyId, page, pageSize, vessel } = params;
  const skip = (page - 1) * pageSize;
  const where = { companyId, ...(vessel ? { vessel } : {}) };
  const [records, total] = await Promise.all([
    db.cIPRecord.findMany({ where, skip, take: pageSize, orderBy: { cipDate: "desc" } }),
    db.cIPRecord.count({ where }),
  ]);
  return { records, total };
}

export async function getCIPRecordById(id: string) {
  return db.cIPRecord.findUnique({ where: { id } });
}

export async function createCIPRecord(params: {
  companyId: string;
  vessel: string;
  cipDate: Date;
  startTime?: string;
  endTime?: string;
  causticTemp?: number;
  causticHL?: number;
  causticTimeMin?: number;
  causticCondition?: string;
  pushWaterHL?: number;
  nitricAcidPct?: number;
  nitricHL?: number;
  nitricTimeMin?: number;
  rinsingWaterHL?: number;
  rinsingTimeMin?: number;
  carryOver?: string;
  operatorSign?: string;
  notes?: string;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { createdById, userName, ipAddress, userAgent, ...fields } = params;

  const record = await db.cIPRecord.create({
    data: {
      ...fields,
      cipDate: fields.cipDate,
      startTime: fields.startTime ?? null,
      endTime: fields.endTime ?? null,
      causticTemp: fields.causticTemp ?? null,
      causticHL: fields.causticHL ?? null,
      causticTimeMin: fields.causticTimeMin ?? null,
      causticCondition: fields.causticCondition ?? null,
      pushWaterHL: fields.pushWaterHL ?? null,
      nitricAcidPct: fields.nitricAcidPct ?? null,
      nitricHL: fields.nitricHL ?? null,
      nitricTimeMin: fields.nitricTimeMin ?? null,
      rinsingWaterHL: fields.rinsingWaterHL ?? null,
      rinsingTimeMin: fields.rinsingTimeMin ?? null,
      carryOver: fields.carryOver ?? null,
      operatorSign: fields.operatorSign ?? null,
      notes: fields.notes ?? null,
      createdById,
    },
  });

  await createAuditLog({
    userId: createdById, userName,
    action: "CREATE", module: "brewing", resource: "cip",
    recordId: record.id,
    description: `Created CIP record for ${fields.vessel}`,
    ipAddress, userAgent,
  });

  return record;
}
