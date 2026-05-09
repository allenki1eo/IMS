import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listStandards(
  companyId: string,
  params: {
    search?: string;
    itemId?: string;
    isActive?: boolean;
    page: number;
    pageSize: number;
  }
) {
  const { search, itemId, isActive, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(itemId ? { itemId } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search } },
            { name: { contains: search } },
          ],
        }
      : {}),
  };

  const [standards, total] = await Promise.all([
    db.qualityStandard.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        item: { select: { id: true, code: true, name: true } },
        _count: { select: { parameters: true } },
      },
    }),
    db.qualityStandard.count({ where }),
  ]);

  return { data: standards, meta: { total, page, pageSize } };
}

export async function getStandard(companyId: string, id: string) {
  const standard = await db.qualityStandard.findUnique({
    where: { id },
    include: {
      parameters: { orderBy: { sortOrder: "asc" } },
      item: { select: { id: true, code: true, name: true } },
    },
  });

  if (!standard) return null;
  if (standard.companyId !== companyId) return null;
  return standard;
}

export async function createStandard(
  companyId: string,
  data: {
    code: string;
    name: string;
    itemId?: string | null;
    description?: string | null;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  if (data.itemId) {
    const item = await db.item.findUnique({ where: { id: data.itemId } });
    if (!item) throw new Error("Item not found");
    if (item.companyId !== companyId) throw new Error("Item not found");
  }

  const existing = await db.qualityStandard.findFirst({
    where: { companyId, code: data.code },
  });
  if (existing) throw new Error("A standard with this code already exists");

  const standard = await db.qualityStandard.create({
    data: {
      companyId,
      code: data.code,
      name: data.name,
      itemId: data.itemId ?? null,
      description: data.description ?? null,
      isActive: true,
      createdById: userId,
    },
  });

  await createAuditLog({
    userId,
    userName,
    action: "QC_STANDARD_CREATE",
    module: "qc",
    resource: "standard",
    recordId: standard.id,
    newValue: { code: data.code, name: data.name, itemId: data.itemId },
    description: `Created quality standard: ${data.code} - ${data.name}`,
    ipAddress,
    companyId,
  });

  return standard;
}

export async function updateStandard(
  companyId: string,
  id: string,
  data: {
    code?: string;
    name?: string;
    itemId?: string | null;
    description?: string | null;
    isActive?: boolean;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.qualityStandard.findUnique({ where: { id } });
  if (!existing) throw new Error("Quality standard not found");
  if (existing.companyId !== companyId) throw new Error("Quality standard not found");

  if (data.itemId) {
    const item = await db.item.findUnique({ where: { id: data.itemId } });
    if (!item) throw new Error("Item not found");
    if (item.companyId !== companyId) throw new Error("Item not found");
  }

  if (data.code && data.code !== existing.code) {
    const duplicate = await db.qualityStandard.findFirst({
      where: { companyId, code: data.code, NOT: { id } },
    });
    if (duplicate) throw new Error("A standard with this code already exists");
  }

  const updateData: Record<string, unknown> = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.itemId !== undefined) updateData.itemId = data.itemId;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await db.qualityStandard.update({ where: { id }, data: updateData });

  await createAuditLog({
    userId,
    userName,
    action: "QC_STANDARD_UPDATE",
    module: "qc",
    resource: "standard",
    recordId: id,
    oldValue: { code: existing.code, name: existing.name, isActive: existing.isActive },
    newValue: updateData,
    description: `Updated quality standard: ${existing.code}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function addParameter(
  companyId: string,
  standardId: string,
  data: {
    name: string;
    unit?: string | null;
    minValue?: number | null;
    maxValue?: number | null;
    targetValue?: number | null;
    isRequired?: boolean;
    sortOrder?: number;
  }
) {
  const standard = await db.qualityStandard.findUnique({ where: { id: standardId } });
  if (!standard) throw new Error("Quality standard not found");
  if (standard.companyId !== companyId) throw new Error("Quality standard not found");

  const parameter = await db.qualityStandardParameter.create({
    data: {
      standardId,
      name: data.name,
      unit: data.unit ?? null,
      minValue: data.minValue ?? null,
      maxValue: data.maxValue ?? null,
      targetValue: data.targetValue ?? null,
      isRequired: data.isRequired ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });

  return parameter;
}

export async function removeParameter(
  companyId: string,
  standardId: string,
  parameterId: string
) {
  const standard = await db.qualityStandard.findUnique({ where: { id: standardId } });
  if (!standard) throw new Error("Quality standard not found");
  if (standard.companyId !== companyId) throw new Error("Quality standard not found");

  const parameter = await db.qualityStandardParameter.findUnique({ where: { id: parameterId } });
  if (!parameter) throw new Error("Parameter not found");
  if (parameter.standardId !== standardId) throw new Error("Parameter not found");

  await db.qualityStandardParameter.delete({ where: { id: parameterId } });
}

export async function updateParameter(
  companyId: string,
  standardId: string,
  parameterId: string,
  data: {
    name?: string;
    unit?: string | null;
    minValue?: number | null;
    maxValue?: number | null;
    targetValue?: number | null;
    isRequired?: boolean;
    sortOrder?: number;
  }
) {
  const standard = await db.qualityStandard.findUnique({ where: { id: standardId } });
  if (!standard) throw new Error("Quality standard not found");
  if (standard.companyId !== companyId) throw new Error("Quality standard not found");

  const parameter = await db.qualityStandardParameter.findUnique({ where: { id: parameterId } });
  if (!parameter) throw new Error("Parameter not found");
  if (parameter.standardId !== standardId) throw new Error("Parameter not found");

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.minValue !== undefined) updateData.minValue = data.minValue;
  if (data.maxValue !== undefined) updateData.maxValue = data.maxValue;
  if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
  if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  const updated = await db.qualityStandardParameter.update({
    where: { id: parameterId },
    data: updateData,
  });

  return updated;
}
