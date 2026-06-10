import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function genRef(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export const FERMENTATION_STAGES = [
  { value: "PITCHING", label: "Pitching" },
  { value: "PRIMARY", label: "Primary Fermentation" },
  { value: "SECONDARY", label: "Secondary / Conditioning" },
  { value: "MATURATION", label: "Maturation" },
  { value: "LAGERING", label: "Lagering" },
  { value: "TRANSFER_TO_BBT", label: "Transfer to BBT" },
  { value: "FINAL", label: "Final Check" },
];

// ─── Unitank Analysis ─────────────────────────────────────────────────────────

export async function listUnitankAnalyses(params: {
  companyId: string;
  page: number;
  pageSize: number;
  batchId?: string;
  tankNumber?: string;
}) {
  const { companyId, page, pageSize, batchId, tankNumber } = params;
  const skip = (page - 1) * pageSize;
  const where = {
    companyId,
    ...(batchId ? { batchId } : {}),
    ...(tankNumber ? { tankNumber: { contains: tankNumber } } : {}),
  };
  const [analyses, total] = await Promise.all([
    db.unitankAnalysis.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ sampleDate: "desc" }],
      include: { batch: { select: { id: true, reference: true, productName: true } } },
    }),
    db.unitankAnalysis.count({ where }),
  ]);
  return { analyses, total };
}

export async function getUnitankAnalysisById(id: string) {
  return db.unitankAnalysis.findUnique({
    where: { id },
    include: { batch: { select: { id: true, reference: true, productName: true } } },
  });
}

export async function createUnitankAnalysis(params: {
  companyId: string;
  batchId?: string;
  tankNumber: string;
  brand: string;
  stage: string;
  sampleDate: Date;
  sampleTime?: string;
  alc?: number;
  oe?: number;
  pg?: number;
  ph?: number;
  fg?: number;
  col?: number;
  bu?: number;
  adf?: number;
  analystId?: string;
  notes?: string;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { createdById, userName, ipAddress, userAgent, ...fields } = params;

  const record = await db.unitankAnalysis.create({
    data: {
      ...fields,
      batchId: fields.batchId ?? null,
      sampleTime: fields.sampleTime ?? null,
      alc: fields.alc ?? null,
      oe: fields.oe ?? null,
      pg: fields.pg ?? null,
      ph: fields.ph ?? null,
      fg: fields.fg ?? null,
      col: fields.col ?? null,
      bu: fields.bu ?? null,
      adf: fields.adf ?? null,
      analystId: fields.analystId ?? null,
      notes: fields.notes ?? null,
      createdById,
    },
  });

  await createAuditLog({
    userId: createdById, userName,
    action: "CREATE", module: "lab", resource: "unitank",
    recordId: record.id,
    description: `Created unitank analysis for UT ${fields.tankNumber} / ${fields.brand}`,
    ipAddress, userAgent,
  });

  return record;
}

// ─── BBT Analysis ─────────────────────────────────────────────────────────────

export async function listBBTAnalyses(params: {
  companyId: string;
  page: number;
  pageSize: number;
  batchId?: string;
}) {
  const { companyId, page, pageSize, batchId } = params;
  const skip = (page - 1) * pageSize;
  const where = { companyId, ...(batchId ? { batchId } : {}) };
  const [analyses, total] = await Promise.all([
    db.bBTAnalysis.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ sampleDate: "desc" }],
      include: { batch: { select: { id: true, reference: true, productName: true } } },
    }),
    db.bBTAnalysis.count({ where }),
  ]);
  return { analyses, total };
}

export async function getBBTAnalysisById(id: string) {
  return db.bBTAnalysis.findUnique({
    where: { id },
    include: { batch: { select: { id: true, reference: true, productName: true } } },
  });
}

export async function createBBTAnalysis(params: {
  companyId: string;
  batchId?: string;
  fromTankNumber?: string;
  bbtNumber: string;
  brand: string;
  sampleDate: Date;
  sampleTime?: string;
  pg?: number;
  og?: number;
  alc?: number;
  haze?: number;
  ph?: number;
  col?: number;
  dissolvedO2?: number;
  bitterness?: number;
  bbtTemp?: number;
  adf?: number;
  analystId?: string;
  notes?: string;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { createdById, userName, ipAddress, userAgent, ...fields } = params;

  const record = await db.bBTAnalysis.create({
    data: {
      ...fields,
      batchId: fields.batchId ?? null,
      fromTankNumber: fields.fromTankNumber ?? null,
      sampleTime: fields.sampleTime ?? null,
      pg: fields.pg ?? null,
      og: fields.og ?? null,
      alc: fields.alc ?? null,
      haze: fields.haze ?? null,
      ph: fields.ph ?? null,
      col: fields.col ?? null,
      dissolvedO2: fields.dissolvedO2 ?? null,
      bitterness: fields.bitterness ?? null,
      bbtTemp: fields.bbtTemp ?? null,
      adf: fields.adf ?? null,
      analystId: fields.analystId ?? null,
      notes: fields.notes ?? null,
      createdById,
    },
  });

  await createAuditLog({
    userId: createdById, userName,
    action: "CREATE", module: "lab", resource: "bbt",
    recordId: record.id,
    description: `Created BBT analysis for BBT ${fields.bbtNumber} / ${fields.brand}`,
    ipAddress, userAgent,
  });

  return record;
}

// ─── Micro Reports ────────────────────────────────────────────────────────────

export async function listMicroReports(params: {
  companyId: string;
  page: number;
  pageSize: number;
}) {
  const { companyId, page, pageSize } = params;
  const skip = (page - 1) * pageSize;
  const where = { companyId };
  const [reports, total] = await Promise.all([
    db.microReport.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { reportDate: "desc" },
      include: { samples: { orderBy: { sortOrder: "asc" } } },
    }),
    db.microReport.count({ where }),
  ]);
  return { reports, total };
}

export async function getMicroReportById(id: string) {
  return db.microReport.findUnique({
    where: { id },
    include: { samples: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function createMicroReport(params: {
  companyId: string;
  reportDate: Date;
  analystId?: string;
  samples: Array<{
    sampleType: string;
    sampleSource?: string;
    brand?: string;
    desiredDetection?: string;
    incubation?: string;
    media?: string;
    result?: string;
    isInSpec?: boolean;
    actual?: string;
    remarks?: string;
    sortOrder?: number;
  }>;
  notes?: string;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { companyId, reportDate, analystId, samples, notes, createdById, userName, ipAddress, userAgent } = params;
  const reference = genRef("MICRO");

  const report = await db.microReport.create({
    data: {
      companyId,
      reference,
      reportDate,
      analystId: analystId ?? null,
      notes: notes ?? null,
      createdById,
      samples: {
        create: samples.map((s, i) => ({
          sampleType: s.sampleType,
          sampleSource: s.sampleSource ?? null,
          brand: s.brand ?? null,
          desiredDetection: s.desiredDetection ?? null,
          incubation: s.incubation ?? null,
          media: s.media ?? null,
          result: s.result ?? null,
          isInSpec: s.isInSpec ?? null,
          actual: s.actual ?? null,
          remarks: s.remarks ?? null,
          sortOrder: s.sortOrder ?? i,
        })),
      },
    },
    include: { samples: true },
  });

  await createAuditLog({
    userId: createdById, userName,
    action: "CREATE", module: "lab", resource: "micro",
    recordId: report.id,
    description: `Created daily micro report ${reference}`,
    ipAddress, userAgent,
  });

  return report;
}

// ─── Product Specs ────────────────────────────────────────────────────────────

export async function listProductSpecs(params: {
  companyId: string;
  page: number;
  pageSize: number;
}) {
  const { companyId, page, pageSize } = params;
  const skip = (page - 1) * pageSize;
  const where = { companyId };
  const [specs, total] = await Promise.all([
    db.productSpec.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { brand: "asc" },
      include: { parameters: { orderBy: { sortOrder: "asc" } } },
    }),
    db.productSpec.count({ where }),
  ]);
  return { specs, total };
}

export async function getProductSpecById(id: string) {
  return db.productSpec.findUnique({
    where: { id },
    include: { parameters: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function createProductSpec(params: {
  companyId: string;
  brand: string;
  productCode?: string;
  version?: string;
  parameters: Array<{
    paramName: string;
    unit?: string;
    target?: string;
    rangeMin?: string;
    rangeMax?: string;
    notes?: string;
    sortOrder?: number;
  }>;
  notes?: string;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { companyId, brand, productCode, version, parameters, notes, createdById, userName, ipAddress, userAgent } = params;

  const spec = await db.productSpec.create({
    data: {
      companyId,
      brand,
      productCode: productCode ?? null,
      version: version ?? "1",
      notes: notes ?? null,
      createdById,
      parameters: {
        create: parameters.map((p, i) => ({
          paramName: p.paramName,
          unit: p.unit ?? null,
          target: p.target ?? null,
          rangeMin: p.rangeMin ?? null,
          rangeMax: p.rangeMax ?? null,
          notes: p.notes ?? null,
          sortOrder: p.sortOrder ?? i,
        })),
      },
    },
    include: { parameters: true },
  });

  await createAuditLog({
    userId: createdById, userName,
    action: "CREATE", module: "lab", resource: "spec",
    recordId: spec.id,
    description: `Created product spec for ${brand}`,
    ipAddress, userAgent,
  });

  return spec;
}

export async function updateProductSpec(params: {
  id: string;
  data: { brand?: string; productCode?: string; version?: string; isActive?: boolean; notes?: string };
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, data, updatedById, userName, ipAddress, userAgent } = params;

  const spec = await db.productSpec.update({ where: { id }, data });

  await createAuditLog({
    userId: updatedById, userName,
    action: "UPDATE", module: "lab", resource: "spec",
    recordId: id,
    description: `Updated product spec ${id}`,
    ipAddress, userAgent,
  });

  return spec;
}
