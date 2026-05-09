import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listTanks(
  companyId: string,
  params: {
    search?: string;
    branchId?: string;
    fuelType?: string;
    isActive?: boolean;
  }
) {
  const { search, branchId, fuelType, isActive } = params;

  const where = {
    companyId,
    ...(branchId ? { branchId } : {}),
    ...(fuelType ? { fuelType } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
            { fuelType: { contains: search } },
          ],
        }
      : {}),
  };

  const tanks = await db.fuelTank.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { receipts: true, issues: true },
      },
    },
  });

  return tanks.map((tank) => ({
    ...tank,
    fillPercentage: tank.capacity > 0 ? (tank.currentLevel / tank.capacity) * 100 : 0,
  }));
}

export async function getTankById(id: string) {
  const tank = await db.fuelTank.findUnique({
    where: { id },
    include: {
      receipts: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      issues: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          vehicle: {
            select: { id: true, plateNumber: true, make: true, model: true },
          },
          driver: {
            include: {
              employee: { select: { id: true, fullName: true } },
            },
          },
        },
      },
    },
  });

  if (!tank) return null;

  return {
    ...tank,
    fillPercentage: tank.capacity > 0 ? (tank.currentLevel / tank.capacity) * 100 : 0,
  };
}

export async function createTank(params: {
  companyId: string;
  branchId?: string | null;
  name: string;
  code: string;
  fuelType: string;
  capacity: number;
  currentLevel?: number;
  minLevel?: number;
  notes?: string | null;
  createdById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { createdById, userName, ipAddress, ...data } = params;

  const tank = await db.fuelTank.create({
    data: {
      companyId: data.companyId,
      branchId: data.branchId ?? null,
      name: data.name,
      code: data.code,
      fuelType: data.fuelType,
      capacity: data.capacity,
      currentLevel: data.currentLevel ?? 0,
      minLevel: data.minLevel ?? 0,
      notes: data.notes ?? null,
      createdById,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "FUEL_TANK_CREATE",
    module: "fuel",
    resource: "tank",
    recordId: tank.id,
    newValue: {
      name: data.name,
      code: data.code,
      fuelType: data.fuelType,
      capacity: data.capacity,
    },
    description: `Created fuel tank: ${data.name} (${data.code})`,
    ipAddress,
    companyId: data.companyId,
  });

  return tank;
}

export async function updateTank(params: {
  id: string;
  data: {
    branchId?: string | null;
    name?: string;
    code?: string;
    fuelType?: string;
    capacity?: number;
    minLevel?: number;
    notes?: string | null;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, data, updatedById, userName, ipAddress } = params;

  const existing = await db.fuelTank.findUnique({ where: { id } });
  if (!existing) throw new Error("Fuel tank not found");

  const updated = await db.fuelTank.update({ where: { id }, data });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "FUEL_TANK_UPDATE",
    module: "fuel",
    resource: "tank",
    recordId: id,
    oldValue: { name: existing.name, code: existing.code, capacity: existing.capacity },
    newValue: data as Record<string, unknown>,
    description: `Updated fuel tank: ${existing.name} (${existing.code})`,
    ipAddress,
    companyId: existing.companyId,
  });

  return updated;
}

export async function setTankStatus(params: {
  id: string;
  isActive: boolean;
  updatedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, isActive, updatedById, userName, ipAddress } = params;

  const existing = await db.fuelTank.findUnique({ where: { id } });
  if (!existing) throw new Error("Fuel tank not found");

  const updated = await db.fuelTank.update({ where: { id }, data: { isActive } });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "FUEL_TANK_STATUS_CHANGE",
    module: "fuel",
    resource: "tank",
    recordId: id,
    oldValue: { isActive: existing.isActive },
    newValue: { isActive },
    description: `${isActive ? "Activated" : "Deactivated"} fuel tank: ${existing.name} (${existing.code})`,
    ipAddress,
    companyId: existing.companyId,
  });

  return updated;
}
