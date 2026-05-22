import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

type DispatchOrderListRow = {
  _count: { lines: number };
};

function generateRef(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `DO-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export async function listOrders(
  companyId: string,
  params: {
    search?: string;
    status?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, status, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search } },
            { customerName: { contains: search } },
            { customerContact: { contains: search } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    db.dispatchOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
        _count: { select: { lines: true } },
      },
    }),
    db.dispatchOrder.count({ where }),
  ]);

  return {
    data: (orders as DispatchOrderListRow[]).map((order) => ({ ...order, lineCount: order._count.lines })),
    meta: { total, page, pageSize },
  };
}

export async function getOrder(companyId: string, id: string) {
  const order = await db.dispatchOrder.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          lot: {
            select: {
              id: true,
              lotNumber: true,
              quantityIn: true,
              quantityOut: true,
              status: true,
              product: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
      vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          licenseNumber: true,
          employee: { select: { fullName: true } },
        },
      },
    },
  });

  if (!order) return null;
  if (order.companyId !== companyId) return null;
  return order;
}

export async function createOrder(
  companyId: string,
  data: {
    customerName: string;
    customerContact?: string | null;
    deliveryAddress?: string | null;
    scheduledDate?: string | null;
    vehicleId?: string | null;
    driverId?: string | null;
    notes?: string | null;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  if (data.vehicleId) {
    const vehicle = await db.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle) throw new Error("Vehicle not found");
    if (vehicle.companyId !== companyId) throw new Error("Vehicle not found");
  }

  if (data.driverId) {
    const driver = await db.driver.findUnique({ where: { id: data.driverId } });
    if (!driver) throw new Error("Driver not found");
    if (driver.companyId !== companyId) throw new Error("Driver not found");
  }

  const reference = generateRef();

  const order = await db.dispatchOrder.create({
    data: {
      companyId,
      reference,
      status: "DRAFT",
      customerName: data.customerName,
      customerContact: data.customerContact ?? null,
      deliveryAddress: data.deliveryAddress ?? null,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      vehicleId: data.vehicleId ?? null,
      driverId: data.driverId ?? null,
      notes: data.notes ?? null,
      createdById: userId,
    },
  });

  await createAuditLog({
    userId,
    userName,
    action: "DISPATCH_ORDER_CREATE",
    module: "dispatch",
    resource: "order",
    recordId: order.id,
    newValue: { reference, customerName: data.customerName, status: "DRAFT" },
    description: `Created dispatch order: ${reference} for ${data.customerName}`,
    ipAddress,
    companyId,
  });

  return order;
}

export async function updateOrder(
  companyId: string,
  id: string,
  data: {
    customerName?: string;
    customerContact?: string | null;
    deliveryAddress?: string | null;
    scheduledDate?: string | null;
    vehicleId?: string | null;
    driverId?: string | null;
    notes?: string | null;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.dispatchOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Dispatch order not found");
  if (existing.companyId !== companyId) throw new Error("Dispatch order not found");
  if (existing.status !== "DRAFT") throw new Error("Only DRAFT orders can be updated");

  if (data.vehicleId) {
    const vehicle = await db.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle) throw new Error("Vehicle not found");
    if (vehicle.companyId !== companyId) throw new Error("Vehicle not found");
  }

  if (data.driverId) {
    const driver = await db.driver.findUnique({ where: { id: data.driverId } });
    if (!driver) throw new Error("Driver not found");
    if (driver.companyId !== companyId) throw new Error("Driver not found");
  }

  const updateData: Record<string, unknown> = {};
  if (data.customerName !== undefined) updateData.customerName = data.customerName;
  if (data.customerContact !== undefined) updateData.customerContact = data.customerContact;
  if (data.deliveryAddress !== undefined) updateData.deliveryAddress = data.deliveryAddress;
  if (data.scheduledDate !== undefined)
    updateData.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null;
  if (data.vehicleId !== undefined) updateData.vehicleId = data.vehicleId;
  if (data.driverId !== undefined) updateData.driverId = data.driverId;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const updated = await db.dispatchOrder.update({ where: { id }, data: updateData });

  await createAuditLog({
    userId,
    userName,
    action: "DISPATCH_ORDER_UPDATE",
    module: "dispatch",
    resource: "order",
    recordId: id,
    oldValue: { status: existing.status, customerName: existing.customerName },
    newValue: updateData,
    description: `Updated dispatch order: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function confirmOrder(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.dispatchOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Dispatch order not found");
  if (existing.companyId !== companyId) throw new Error("Dispatch order not found");
  if (existing.status !== "DRAFT") throw new Error("Only DRAFT orders can be confirmed");
  const lineCount = await db.dispatchOrderLine.count({ where: { orderId: id } });
  if (lineCount === 0) throw new Error("At least one line is required before confirming");

  const updated = await db.dispatchOrder.update({
    where: { id },
    data: { status: "CONFIRMED" },
  });

  await createAuditLog({
    userId,
    userName,
    action: "DISPATCH_ORDER_CONFIRM",
    module: "dispatch",
    resource: "order",
    recordId: id,
    oldValue: { status: "DRAFT" },
    newValue: { status: "CONFIRMED" },
    description: `Confirmed dispatch order: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function dispatchOrder(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.dispatchOrder.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!existing) throw new Error("Dispatch order not found");
  if (existing.companyId !== companyId) throw new Error("Dispatch order not found");
  if (existing.status !== "CONFIRMED") throw new Error("Only CONFIRMED orders can be dispatched");

  // Validate lot availability before transaction
  for (const line of existing.lines) {
    if (line.lotId) {
      const lot = await db.fGLot.findUnique({ where: { id: line.lotId } });
      if (!lot) throw new Error(`Lot not found for line: ${line.description}`);
      if (lot.companyId !== companyId) throw new Error(`Lot not found for line: ${line.description}`);
      const available = lot.quantityIn - lot.quantityOut;
      if (available < line.quantity) {
        throw new Error(
          `Insufficient quantity for lot${lot.lotNumber ? " " + lot.lotNumber : ""}: available ${available}, required ${line.quantity}`
        );
      }
    }
  }

  const now = new Date();

  const updated = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const order = await tx.dispatchOrder.update({
      where: { id },
      data: { status: "DISPATCHED", dispatchedAt: now },
    });

    for (const line of existing.lines) {
      if (line.lotId) {
        const lot = await tx.fGLot.findUnique({ where: { id: line.lotId } });
        if (!lot) throw new Error(`Lot not found for line: ${line.description}`);
        const updatedLot = await tx.fGLot.updateMany({
          where: {
            id: line.lotId,
            companyId,
            status: "AVAILABLE",
            quantityOut: { lte: lot.quantityIn - line.quantity },
          },
          data: { quantityOut: { increment: line.quantity } },
        });
        if (updatedLot.count === 0) {
          const available = lot.quantityIn - lot.quantityOut;
          throw new Error(
            `Insufficient quantity for lot${lot.lotNumber ? " " + lot.lotNumber : ""}: available ${available}, required ${line.quantity}`
          );
        }

        const refreshed = await tx.fGLot.findUnique({ where: { id: line.lotId } });
        if (refreshed && refreshed.quantityOut >= refreshed.quantityIn) {
          await tx.fGLot.update({
            where: { id: line.lotId },
            data: { status: "DEPLETED" },
          });
        }
      }
    }

    return order;
  });

  await createAuditLog({
    userId,
    userName,
    action: "DISPATCH_ORDER_DISPATCH",
    module: "dispatch",
    resource: "order",
    recordId: id,
    oldValue: { status: "CONFIRMED" },
    newValue: { status: "DISPATCHED", dispatchedAt: now },
    description: `Dispatched order: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function markDelivered(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.dispatchOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Dispatch order not found");
  if (existing.companyId !== companyId) throw new Error("Dispatch order not found");
  if (existing.status !== "DISPATCHED") throw new Error("Only DISPATCHED orders can be marked delivered");

  const now = new Date();

  const updated = await db.dispatchOrder.update({
    where: { id },
    data: { status: "DELIVERED", deliveredAt: now },
  });

  await createAuditLog({
    userId,
    userName,
    action: "DISPATCH_ORDER_DELIVERED",
    module: "dispatch",
    resource: "order",
    recordId: id,
    oldValue: { status: "DISPATCHED" },
    newValue: { status: "DELIVERED", deliveredAt: now },
    description: `Marked order delivered: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function cancelOrder(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.dispatchOrder.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!existing) throw new Error("Dispatch order not found");
  if (existing.companyId !== companyId) throw new Error("Dispatch order not found");

  const cancellableStatuses = ["DRAFT", "CONFIRMED", "DISPATCHED"];
  if (!cancellableStatuses.includes(existing.status)) {
    throw new Error("Only DRAFT, CONFIRMED, or DISPATCHED orders can be cancelled");
  }

  const updated = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const order = await tx.dispatchOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    // If order was DISPATCHED, reverse lot quantityOut (restock)
    if (existing.status === "DISPATCHED") {
      for (const line of existing.lines) {
        if (line.lotId) {
          const updatedLot = await tx.fGLot.updateMany({
            where: { id: line.lotId, companyId, quantityOut: { gte: line.quantity } },
            data: { quantityOut: { decrement: line.quantity } },
          });
          if (updatedLot.count === 0) throw new Error("Unable to reverse dispatched lot quantity");

          const lot = await tx.fGLot.findUnique({ where: { id: line.lotId } });
          if (lot && lot.quantityOut < lot.quantityIn && lot.status === "DEPLETED") {
            await tx.fGLot.update({
              where: { id: line.lotId },
              data: { status: "AVAILABLE" },
            });
          }
        }
      }
    }

    return order;
  });

  await createAuditLog({
    userId,
    userName,
    action: "DISPATCH_ORDER_CANCEL",
    module: "dispatch",
    resource: "order",
    recordId: id,
    oldValue: { status: existing.status },
    newValue: { status: "CANCELLED" },
    description: `Cancelled dispatch order: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function addLine(
  companyId: string,
  orderId: string,
  data: {
    lotId?: string | null;
    productId?: string | null;
    description: string;
    quantity: number;
    uom?: string | null;
    unitPrice?: number | null;
  }
) {
  const order = await db.dispatchOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Dispatch order not found");
  if (order.companyId !== companyId) throw new Error("Dispatch order not found");
  if (order.status !== "DRAFT") throw new Error("Lines can only be added to DRAFT orders");

  if (!Number.isFinite(data.quantity) || data.quantity <= 0) throw new Error("Quantity must be greater than zero");
  if (data.unitPrice != null && (!Number.isFinite(data.unitPrice) || data.unitPrice < 0)) {
    throw new Error("Unit price cannot be negative");
  }

  let productId = data.productId ?? null;
  if (data.lotId) {
    const lot = await db.fGLot.findUnique({ where: { id: data.lotId } });
    if (!lot) throw new Error("Lot not found");
    if (lot.companyId !== companyId) throw new Error("Lot not found");
    if (lot.status !== "AVAILABLE") throw new Error("Lot is not available");
    const available = lot.quantityIn - lot.quantityOut;
    if (available < data.quantity) {
      throw new Error(`Insufficient quantity for lot${lot.lotNumber ? " " + lot.lotNumber : ""}: available ${available}, required ${data.quantity}`);
    }
    if (productId && productId !== lot.productId) throw new Error("Selected product does not match the lot");
    productId = lot.productId;
  }

  if (productId) {
    const product = await db.fGProduct.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");
    if (product.companyId !== companyId) throw new Error("Product not found");
    if (!product.isActive) throw new Error("Product is inactive");
  }

  const totalPrice =
    data.quantity !== undefined && data.unitPrice !== undefined && data.unitPrice !== null
      ? data.quantity * data.unitPrice
      : null;

  const line = await db.dispatchOrderLine.create({
    data: {
      orderId,
      lotId: data.lotId ?? null,
      productId,
      description: data.description,
      quantity: data.quantity,
      uom: data.uom ?? "UNIT",
      unitPrice: data.unitPrice ?? null,
      totalPrice,
    },
  });

  return line;
}

export async function removeLine(
  companyId: string,
  orderId: string,
  lineId: string
) {
  const order = await db.dispatchOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Dispatch order not found");
  if (order.companyId !== companyId) throw new Error("Dispatch order not found");
  if (order.status !== "DRAFT") throw new Error("Lines can only be removed from DRAFT orders");

  const line = await db.dispatchOrderLine.findUnique({ where: { id: lineId } });
  if (!line) throw new Error("Line not found");
  if (line.orderId !== orderId) throw new Error("Line not found");

  await db.dispatchOrderLine.delete({ where: { id: lineId } });
}
