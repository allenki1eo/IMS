import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listSchedules(
  params: {
    vehicleId?: string;
    maintenanceType?: string;
    page: number;
    pageSize: number;
  }
) {
  const { vehicleId, maintenanceType, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(vehicleId ? { vehicleId } : {}),
    ...(maintenanceType ? { maintenanceType } : {}),
  };

  const [schedules, total] = await Promise.all([
    db.maintenanceSchedule.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            make: true,
            model: true,
            odometer: true,
          },
        },
        _count: {
          select: { workOrders: true },
        },
      },
    }),
    db.maintenanceSchedule.count({ where }),
  ]);

  return { data: schedules, meta: { total, page, pageSize } };
}

export async function getSchedule(companyId: string, id: string) {
  const schedule = await db.maintenanceSchedule.findUnique({
    where: { id },
    include: {
      vehicle: {
        select: {
          id: true,
          plateNumber: true,
          make: true,
          model: true,
          odometer: true,
        },
      },
      workOrders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          reference: true,
          status: true,
          priority: true,
          createdAt: true,
          completedAt: true,
          actualCost: true,
        },
      },
    },
  });

  if (!schedule) return null;
  return schedule;
}

export async function createSchedule(
  companyId: string,
  data: {
    vehicleId: string;
    maintenanceType: string;
    description?: string | null;
    intervalKm?: number | null;
    intervalDays?: number | null;
    lastDoneAt?: string | null;
    lastDoneOdometer?: number | null;
    nextDueAt?: string | null;
    nextDueOdometer?: number | null;
  },
  createdById: string,
  userName: string,
  ipAddress?: string
) {
  const vehicle = await db.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw new Error("Vehicle not found");

  const schedule = await db.maintenanceSchedule.create({
    data: {
      companyId,
      vehicleId: data.vehicleId,
      maintenanceType: data.maintenanceType,
      description: data.description ?? null,
      intervalKm: data.intervalKm ?? null,
      intervalDays: data.intervalDays ?? null,
      lastDoneAt: data.lastDoneAt ? new Date(data.lastDoneAt) : null,
      lastDoneOdometer: data.lastDoneOdometer ?? null,
      nextDueAt: data.nextDueAt ? new Date(data.nextDueAt) : null,
      nextDueOdometer: data.nextDueOdometer ?? null,
      createdById,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "MAINTENANCE_SCHEDULE_CREATE",
    module: "maintenance",
    resource: "schedule",
    recordId: schedule.id,
    newValue: {
      vehicleId: data.vehicleId,
      maintenanceType: data.maintenanceType,
      intervalKm: data.intervalKm,
      intervalDays: data.intervalDays,
    },
    description: `Created maintenance schedule: ${data.maintenanceType} for vehicle ${vehicle.plateNumber}`,
    ipAddress,
    companyId,
  });

  return schedule;
}

export async function updateSchedule(
  companyId: string,
  id: string,
  data: {
    vehicleId?: string;
    maintenanceType?: string;
    description?: string | null;
    intervalKm?: number | null;
    intervalDays?: number | null;
    lastDoneAt?: string | null;
    lastDoneOdometer?: number | null;
    nextDueAt?: string | null;
    nextDueOdometer?: number | null;
    isActive?: boolean;
  },
  updatedById: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.maintenanceSchedule.findUnique({ where: { id } });
  if (!existing) throw new Error("Maintenance schedule not found");
  if (existing.companyId !== companyId) throw new Error("Maintenance schedule not found");

  const updateData: Record<string, unknown> = {};
  if (data.vehicleId !== undefined) updateData.vehicleId = data.vehicleId;
  if (data.maintenanceType !== undefined) updateData.maintenanceType = data.maintenanceType;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.intervalKm !== undefined) updateData.intervalKm = data.intervalKm;
  if (data.intervalDays !== undefined) updateData.intervalDays = data.intervalDays;
  if (data.lastDoneAt !== undefined)
    updateData.lastDoneAt = data.lastDoneAt ? new Date(data.lastDoneAt) : null;
  if (data.lastDoneOdometer !== undefined) updateData.lastDoneOdometer = data.lastDoneOdometer;
  if (data.nextDueAt !== undefined)
    updateData.nextDueAt = data.nextDueAt ? new Date(data.nextDueAt) : null;
  if (data.nextDueOdometer !== undefined) updateData.nextDueOdometer = data.nextDueOdometer;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await db.maintenanceSchedule.update({
    where: { id },
    data: updateData,
  });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "MAINTENANCE_SCHEDULE_UPDATE",
    module: "maintenance",
    resource: "schedule",
    recordId: id,
    oldValue: {
      maintenanceType: existing.maintenanceType,
      isActive: existing.isActive,
    },
    newValue: updateData,
    description: `Updated maintenance schedule: ${existing.maintenanceType}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function deleteSchedule(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.maintenanceSchedule.findUnique({
    where: { id },
    include: { _count: { select: { workOrders: true } } },
  });
  if (!existing) throw new Error("Maintenance schedule not found");
  if (existing.companyId !== companyId) throw new Error("Maintenance schedule not found");
  if (existing._count.workOrders > 0) {
    throw new Error("Cannot delete schedule with associated work orders");
  }

  await db.maintenanceSchedule.delete({ where: { id } });

  await createAuditLog({
    userId,
    userName,
    action: "MAINTENANCE_SCHEDULE_DELETE",
    module: "maintenance",
    resource: "schedule",
    recordId: id,
    oldValue: { maintenanceType: existing.maintenanceType },
    description: `Deleted maintenance schedule: ${existing.maintenanceType}`,
    ipAddress,
    companyId,
  });
}
