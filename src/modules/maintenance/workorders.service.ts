import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function generateRef(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `WO-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export async function listWorkOrders(
  params: {
    vehicleId?: string;
    status?: string;
    priority?: string;
    completedFrom?: Date;
    completedTo?: Date;
    page: number;
    pageSize: number;
  }
) {
  const { vehicleId, status, priority, completedFrom, completedTo, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(vehicleId ? { vehicleId } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(completedFrom || completedTo
      ? {
          completedAt: {
            ...(completedFrom ? { gte: completedFrom } : {}),
            ...(completedTo ? { lte: completedTo } : {}),
          },
        }
      : {}),
  };

  const [workOrders, total] = await Promise.all([
    db.workOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        vehicle: {
          select: { id: true, plateNumber: true, make: true, model: true },
        },
        schedule: {
          select: { id: true, maintenanceType: true },
        },
        _count: {
          select: { items: true },
        },
      },
    }),
    db.workOrder.count({ where }),
  ]);

  return { data: workOrders, meta: { total, page, pageSize } };
}

export async function getWorkOrder(companyId: string, id: string) {
  const workOrder = await db.workOrder.findUnique({
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
      schedule: {
        select: {
          id: true,
          maintenanceType: true,
          intervalKm: true,
          intervalDays: true,
        },
      },
      items: {
        include: {
          sparePart: {
            select: { id: true, code: true, name: true, uom: true, currentStock: true },
          },
        },
      },
    },
  });

  if (!workOrder) return null;
  return workOrder;
}

export async function createWorkOrder(
  companyId: string,
  data: {
    vehicleId: string;
    scheduleId?: string | null;
    maintenanceType: string;
    description?: string | null;
    priority?: string;
    assignedToId?: string | null;
    workshopName?: string | null;
    estimatedCost?: number | null;
  },
  createdById: string,
  userName: string,
  ipAddress?: string
) {
  const vehicle = await db.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw new Error("Vehicle not found");

  if (data.scheduleId) {
    const schedule = await db.maintenanceSchedule.findUnique({ where: { id: data.scheduleId } });
    if (!schedule) throw new Error("Maintenance schedule not found");
    if (schedule.companyId !== companyId) throw new Error("Maintenance schedule not found");
  }

  const reference = generateRef();

  const workOrder = await db.workOrder.create({
    data: {
      companyId,
      vehicleId: data.vehicleId,
      scheduleId: data.scheduleId ?? null,
      reference,
      maintenanceType: data.maintenanceType,
      description: data.description ?? "",
      priority: data.priority ?? "MEDIUM",
      status: "PENDING",
      requestedById: createdById,
      assignedToId: data.assignedToId ?? null,
      workshopName: data.workshopName ?? null,
      estimatedCost: data.estimatedCost ?? null,
      createdById,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "WORK_ORDER_CREATE",
    module: "maintenance",
    resource: "workorder",
    recordId: workOrder.id,
    newValue: {
      reference,
      vehicleId: data.vehicleId,
      maintenanceType: data.maintenanceType,
      priority: data.priority ?? "MEDIUM",
    },
    description: `Created work order: ${reference} for vehicle ${vehicle.plateNumber}`,
    ipAddress,
    companyId,
  });

  return workOrder;
}

export async function updateWorkOrder(
  companyId: string,
  id: string,
  data: {
    maintenanceType?: string;
    description?: string | null;
    priority?: string;
    assignedToId?: string | null;
    workshopName?: string | null;
    estimatedCost?: number | null;
    notes?: string | null;
  },
  updatedById: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.workOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Work order not found");
  if (existing.companyId !== companyId) throw new Error("Work order not found");
  if (existing.status !== "PENDING") throw new Error("Only PENDING work orders can be updated");

  const updateData: Record<string, unknown> = {};
  if (data.maintenanceType !== undefined) updateData.maintenanceType = data.maintenanceType;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
  if (data.workshopName !== undefined) updateData.workshopName = data.workshopName;
  if (data.estimatedCost !== undefined) updateData.estimatedCost = data.estimatedCost;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const updated = await db.workOrder.update({ where: { id }, data: updateData });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "WORK_ORDER_UPDATE",
    module: "maintenance",
    resource: "workorder",
    recordId: id,
    oldValue: { status: existing.status, priority: existing.priority },
    newValue: updateData,
    description: `Updated work order: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function startWorkOrder(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.workOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Work order not found");
  if (existing.companyId !== companyId) throw new Error("Work order not found");
  if (existing.status !== "PENDING") throw new Error("Only PENDING work orders can be started");

  const updated = await db.workOrder.update({
    where: { id },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });

  await createAuditLog({
    userId,
    userName,
    action: "WORK_ORDER_STARTED",
    module: "maintenance",
    resource: "workorder",
    recordId: id,
    oldValue: { status: "PENDING" },
    newValue: { status: "IN_PROGRESS" },
    description: `Started work order: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function completeWorkOrder(
  companyId: string,
  id: string,
  data: {
    actualCost?: number | null;
    completionNotes?: string | null;
    odometerAtService?: number | null;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.workOrder.findUnique({
    where: { id },
    include: { schedule: true },
  });
  if (!existing) throw new Error("Work order not found");
  if (existing.companyId !== companyId) throw new Error("Work order not found");
  if (existing.status !== "IN_PROGRESS") throw new Error("Only IN_PROGRESS work orders can be completed");

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.workOrder.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: now,
        actualCost: data.actualCost ?? null,
        notes: data.completionNotes ?? existing.notes,
        odometerAtWork: data.odometerAtService ?? null,
      },
    });

    // Update vehicle odometer if provided
    if (data.odometerAtService != null) {
      const vehicle = await tx.vehicle.findUnique({ where: { id: existing.vehicleId } });
      if (vehicle && data.odometerAtService > vehicle.odometer) {
        await tx.vehicle.update({
          where: { id: existing.vehicleId },
          data: { odometer: data.odometerAtService },
        });
      }
    }

    // Update schedule next due dates if schedule linked
    if (existing.schedule) {
      const scheduleUpdate: Record<string, unknown> = {
        lastDoneAt: now,
      };
      if (data.odometerAtService != null) {
        scheduleUpdate.lastDoneOdometer = data.odometerAtService;
      }
      if (existing.schedule.intervalDays) {
        const nextDueAt = new Date(now);
        nextDueAt.setDate(nextDueAt.getDate() + existing.schedule.intervalDays);
        scheduleUpdate.nextDueAt = nextDueAt;
      }
      if (data.odometerAtService != null && existing.schedule.intervalKm) {
        scheduleUpdate.nextDueOdometer = data.odometerAtService + existing.schedule.intervalKm;
      }
      await tx.maintenanceSchedule.update({
        where: { id: existing.schedule.id },
        data: scheduleUpdate,
      });
    }
  });

  await createAuditLog({
    userId,
    userName,
    action: "WORK_ORDER_COMPLETED",
    module: "maintenance",
    resource: "workorder",
    recordId: id,
    oldValue: { status: "IN_PROGRESS" },
    newValue: {
      status: "COMPLETED",
      actualCost: data.actualCost,
      odometerAtService: data.odometerAtService,
    },
    description: `Completed work order: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return db.workOrder.findUnique({
    where: { id },
    include: {
      vehicle: {
        select: { id: true, plateNumber: true, make: true, model: true, odometer: true },
      },
      items: true,
    },
  });
}

export async function cancelWorkOrder(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.workOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Work order not found");
  if (existing.companyId !== companyId) throw new Error("Work order not found");
  if (existing.status !== "PENDING") throw new Error("Only PENDING work orders can be cancelled");

  const updated = await db.workOrder.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await createAuditLog({
    userId,
    userName,
    action: "WORK_ORDER_CANCELLED",
    module: "maintenance",
    resource: "workorder",
    recordId: id,
    oldValue: { status: "PENDING" },
    newValue: { status: "CANCELLED" },
    description: `Cancelled work order: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function addWorkOrderItem(
  companyId: string,
  workOrderId: string,
  data: {
    itemType: string;
    description: string;
    sparePartId?: string | null;
    quantity: number;
    unitCost?: number | null;
  }
) {
  const workOrder = await db.workOrder.findUnique({ where: { id: workOrderId } });
  if (!workOrder) throw new Error("Work order not found");
  if (workOrder.companyId !== companyId) throw new Error("Work order not found");

  if (data.sparePartId) {
    const part = await db.sparePart.findUnique({ where: { id: data.sparePartId } });
    if (!part) throw new Error("Spare part not found");
    if (part.companyId !== companyId) throw new Error("Spare part not found");
    if (part.currentStock < data.quantity) {
      throw new Error(
        `Insufficient stock for ${part.name}. Available: ${part.currentStock}, Requested: ${data.quantity}`
      );
    }
  }

  const totalCost =
    data.unitCost != null ? data.quantity * data.unitCost : null;

  const item = await db.workOrderItem.create({
    data: {
      workOrderId,
      itemType: data.itemType,
      description: data.description,
      sparePartId: data.sparePartId ?? null,
      quantity: data.quantity,
      unitCost: data.unitCost ?? null,
      totalCost,
    },
    include: {
      sparePart: {
        select: { id: true, code: true, name: true, uom: true, currentStock: true },
      },
    },
  });

  return item;
}

export async function removeWorkOrderItem(
  companyId: string,
  workOrderId: string,
  itemId: string
) {
  const workOrder = await db.workOrder.findUnique({ where: { id: workOrderId } });
  if (!workOrder) throw new Error("Work order not found");
  if (workOrder.companyId !== companyId) throw new Error("Work order not found");

  const item = await db.workOrderItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Work order item not found");
  if (item.workOrderId !== workOrderId) throw new Error("Work order item not found");

  await db.workOrderItem.delete({ where: { id: itemId } });
}
