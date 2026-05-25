import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listWarehouses(
  companyId: string,
  params: { search?: string; branchId?: string; isActive?: boolean; warehouseType?: string }
) {
  const { search, branchId, isActive, warehouseType } = params;

  const where = {
    companyId,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
          ],
        }
      : {}),
    ...(branchId ? { branchId } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(warehouseType ? { warehouseType } : {}),
  };

  const warehouses = await db.warehouse.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      branch: { select: { id: true, name: true } },
      _count: { select: { locations: true } },
    },
  });

  return warehouses;
}

export async function getWarehouseById(id: string) {
  return db.warehouse.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      locations: {
        include: {
          parent: { select: { id: true, name: true, code: true } },
          children: { select: { id: true, name: true, code: true, locationType: true, isActive: true } },
        },
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function createWarehouse(params: {
  companyId: string;
  branchId?: string | null;
  name: string;
  code: string;
  address?: string | null;
  warehouseType?: string | null;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { createdById, userName, ipAddress, userAgent, ...data } = params;

  const warehouse = await db.warehouse.create({
    data: { ...data, warehouseType: data.warehouseType ?? "MAIN", createdById },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "WAREHOUSE_CREATE",
    module: "warehouse",
    resource: "warehouse",
    recordId: warehouse.id,
    newValue: { name: data.name, code: data.code, branchId: data.branchId ?? undefined },
    description: `Created warehouse: ${data.name}`,
    ipAddress,
    userAgent,
    companyId: data.companyId,
  });

  return warehouse;
}

export async function updateWarehouse(params: {
  id: string;
  data: {
    name?: string;
    code?: string;
    address?: string | null;
    branchId?: string | null;
    warehouseType?: string | null;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, data, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.warehouse.findUnique({ where: { id } });
  if (!existing) throw new Error("Warehouse not found");

  const updated = await db.warehouse.update({ where: { id }, data: data as any });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "WAREHOUSE_UPDATE",
    module: "warehouse",
    resource: "warehouse",
    recordId: id,
    oldValue: { name: existing.name, code: existing.code },
    newValue: data,
    description: `Updated warehouse: ${existing.name}`,
    ipAddress,
    userAgent,
    companyId: existing.companyId,
  });

  return updated;
}

export async function setWarehouseStatus(params: {
  id: string;
  isActive: boolean;
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, isActive, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.warehouse.findUnique({ where: { id } });
  if (!existing) throw new Error("Warehouse not found");

  await db.warehouse.update({ where: { id }, data: { isActive } });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "WAREHOUSE_STATUS_CHANGE",
    module: "warehouse",
    resource: "warehouse",
    recordId: id,
    oldValue: { isActive: existing.isActive },
    newValue: { isActive },
    description: `Set warehouse ${existing.name} to ${isActive ? "active" : "inactive"}`,
    ipAddress,
    userAgent,
    companyId: existing.companyId,
  });
}

export async function listLocations(warehouseId: string) {
  return db.storageLocation.findMany({
    where: { warehouseId },
    orderBy: [{ name: "asc" }],
    include: {
      parent: { select: { id: true, name: true, code: true } },
    },
  });
}

export async function createLocation(params: {
  warehouseId: string;
  parentId?: string | null;
  name: string;
  code: string;
  locationType?: string;
  capacity?: number | null;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { createdById, userName, ipAddress, userAgent, ...data } = params;

  const warehouse = await db.warehouse.findUnique({ where: { id: data.warehouseId } });
  if (!warehouse) throw new Error("Warehouse not found");

  const location = await db.storageLocation.create({
    data: {
      warehouseId: data.warehouseId,
      parentId: data.parentId ?? null,
      name: data.name,
      code: data.code,
      locationType: data.locationType ?? "AREA",
      capacity: data.capacity ?? null,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "LOCATION_CREATE",
    module: "warehouse",
    resource: "location",
    recordId: location.id,
    newValue: { name: data.name, code: data.code, warehouseId: data.warehouseId },
    description: `Created storage location: ${data.name} in warehouse ${warehouse.name}`,
    ipAddress,
    userAgent,
    companyId: warehouse.companyId,
  });

  return location;
}

export async function updateLocation(params: {
  id: string;
  data: {
    name?: string;
    code?: string;
    parentId?: string | null;
    locationType?: string;
    capacity?: number | null;
    isActive?: boolean;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, data, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.storageLocation.findUnique({
    where: { id },
    include: { warehouse: { select: { companyId: true, name: true } } },
  });
  if (!existing) throw new Error("Location not found");

  const updated = await db.storageLocation.update({ where: { id }, data });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "LOCATION_UPDATE",
    module: "warehouse",
    resource: "location",
    recordId: id,
    oldValue: { name: existing.name, code: existing.code },
    newValue: data,
    description: `Updated storage location: ${existing.name}`,
    ipAddress,
    userAgent,
    companyId: existing.warehouse.companyId,
  });

  return updated;
}
