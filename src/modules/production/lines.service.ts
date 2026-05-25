import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function assertPositiveFiniteNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be greater than 0`);
  }
}

export async function listProductionLines(
  companyId: string,
  params: { search?: string; status?: string; lineType?: string; page: number; pageSize: number }
) {
  const { search, status, lineType, page, pageSize } = params;
  const skip = (page - 1) * pageSize;
  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(lineType ? { lineType } : {}),
    ...(search ? { OR: [{ code: { contains: search } }, { name: { contains: search } }, { location: { contains: search } }] } : {}),
  };

  const [data, total] = await Promise.all([
    db.productionLine.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: "asc" },
      include: { _count: { select: { batches: true } } },
    }),
    db.productionLine.count({ where }),
  ]);

  return { data, meta: { total, page, pageSize } };
}

export async function getProductionLine(companyId: string, id: string) {
  const line = await db.productionLine.findUnique({
    where: { id },
    include: {
      batches: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { recipe: { select: { id: true, code: true, name: true } } },
      },
    },
  });
  if (!line || line.companyId !== companyId) return null;
  return line;
}

export async function createProductionLine(
  companyId: string,
  data: {
    code: string;
    name: string;
    lineType?: string;
    location?: string | null;
    capacityPerDay?: number | null;
    uom?: string;
  },
  createdById: string,
  userName: string,
  ipAddress?: string
) {
  if (data.capacityPerDay != null) {
    assertPositiveFiniteNumber(data.capacityPerDay, "capacityPerDay");
  }

  const line = await db.productionLine.create({
    data: {
      companyId,
      code: data.code,
      name: data.name,
      lineType: data.lineType ?? "BREWING",
      location: data.location ?? null,
      capacityPerDay: data.capacityPerDay ?? null,
      uom: data.uom ?? "L",
      createdById,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "PRODUCTION_LINE_CREATE",
    module: "production",
    resource: "line",
    recordId: line.id,
    newValue: { code: line.code, name: line.name },
    description: `Created production line: ${line.name}`,
    ipAddress,
    companyId,
  });

  return line;
}

export async function updateProductionLineStatus(
  companyId: string,
  id: string,
  status: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.productionLine.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId) throw new Error("Production line not found");
  if (!["ACTIVE", "INACTIVE"].includes(status)) throw new Error("Invalid status");

  const updated = await db.productionLine.update({ where: { id }, data: { status } });
  await createAuditLog({
    userId,
    userName,
    action: "PRODUCTION_LINE_STATUS",
    module: "production",
    resource: "line",
    recordId: id,
    oldValue: { status: existing.status },
    newValue: { status },
    description: `Updated production line status: ${existing.code}`,
    ipAddress,
    companyId,
  });
  return updated;
}

export async function deleteProductionLine(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.productionLine.findFirst({
    where: { id, companyId },
    include: { _count: { select: { batches: true } } },
  });
  if (!existing) throw new Error("Production line not found");
  if (existing._count.batches > 0) {
    throw new Error("Production line has batches and cannot be deleted");
  }

  await db.productionLine.delete({ where: { id } });

  await createAuditLog({
    userId,
    userName,
    action: "PRODUCTION_LINE_DELETE",
    module: "production",
    resource: "line",
    recordId: id,
    oldValue: { code: existing.code, name: existing.name },
    description: `Deleted production line: ${existing.name} (${existing.code})`,
    ipAddress,
    companyId,
  });
}

