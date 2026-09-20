import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { generateDatedRef, parseAppDate } from "@/lib/timezone";

type DispatchOrderListRow = {
  _count: { lines: number };
};

function generateRef(): string {
  return generateDatedRef("DO");
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
        lines: { select: { quantity: true } },
        _count: { select: { lines: true } },
      },
    }),
    db.dispatchOrder.count({ where }),
  ]);

  return {
    data: (orders as Array<DispatchOrderListRow & { lines: { quantity: number }[] }>).map((order) => ({
      ...order,
      lineCount: order._count.lines,
      totalQuantity: order.lines.reduce((sum, line) => sum + line.quantity, 0),
    })),
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
              qaStatus: true,
              product: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  requiresTraStamp: true,
                  traStampType: true,
                  lineFamily: true,
                },
              },
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

export type CreateOrderLineInput = {
  lotId?: string | null;
  productId?: string | null;
  description?: string | null;
  quantity: number;
  uom?: string | null;
  unitPrice?: number | null;
};

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
    lines?: CreateOrderLineInput[];
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  if (!data.customerName?.trim()) throw new Error("Customer name is required");

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
  const lines = data.lines ?? [];

  const order = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.dispatchOrder.create({
      data: {
        companyId,
        reference,
        status: "DRAFT",
        customerName: data.customerName.trim(),
        customerContact: data.customerContact ?? null,
        deliveryAddress: data.deliveryAddress ?? null,
        scheduledDate: data.scheduledDate ? parseAppDate(data.scheduledDate) : null,
        vehicleId: data.vehicleId ?? null,
        driverId: data.driverId ?? null,
        notes: data.notes ?? null,
        createdById: userId,
      },
    });

    for (const line of lines) {
      await addLineTx(tx, companyId, created.id, line);
    }

    return created;
  });

  await createAuditLog({
    userId,
    userName,
    action: "DISPATCH_ORDER_CREATE",
    module: "dispatch",
    resource: "order",
    recordId: order.id,
    newValue: { reference, customerName: data.customerName, status: "DRAFT", lineCount: lines.length },
    description: `Created dispatch order: ${reference} for ${data.customerName}`,
    ipAddress,
    companyId,
  });

  return getOrder(companyId, order.id);
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
    updateData.scheduledDate = data.scheduledDate ? parseAppDate(data.scheduledDate) : null;
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
  if (existing.lines.length === 0) {
    throw new Error("Cannot dispatch an order with 0 lines");
  }

  // Validate lot availability / QA / TRA before transaction.
  // Accumulate lot qty + TRA coverage across lines so multi-line orders cannot
  // double-count the same RELEASED lot remaining qty or the same stamp activations.
  const lotNeed = new Map<string, number>();
  const traNeedByLot = new Map<string, { productCode: string; productId: string; need: number }>();

  for (const line of existing.lines) {
    if (!line.lotId) {
      throw new Error(`Lot is required on every line before dispatch (${line.description})`);
    }
    const lot = await db.fGLot.findUnique({
      where: { id: line.lotId },
      include: { product: true },
    });
    if (!lot) throw new Error(`Lot not found for line: ${line.description}`);
    if (lot.companyId !== companyId) throw new Error(`Lot not found for line: ${line.description}`);
    if (lot.qaStatus !== "RELEASED") {
      throw new Error(
        `Lot${lot.lotNumber ? " " + lot.lotNumber : ""} is not QA-released (status: ${lot.qaStatus})`
      );
    }
    lotNeed.set(line.lotId, (lotNeed.get(line.lotId) ?? 0) + line.quantity);
    if (lot.product.requiresTraStamp) {
      const prev = traNeedByLot.get(lot.id);
      traNeedByLot.set(lot.id, {
        productCode: lot.product.code,
        productId: lot.productId,
        need: (prev?.need ?? 0) + line.quantity,
      });
    }
  }

  for (const [lotId, need] of lotNeed) {
    const lot = await db.fGLot.findUnique({ where: { id: lotId } });
    if (!lot) throw new Error("Lot not found");
    const available = lot.quantityIn - lot.quantityOut;
    if (available < need) {
      throw new Error(
        `Insufficient quantity for lot${lot.lotNumber ? " " + lot.lotNumber : ""}: available ${available}, required ${need}`
      );
    }
  }

  if (traNeedByLot.size > 0) {
    const activations = await db.traStampActivation.findMany({
      where: { companyId, dispatchOrderId: id },
    });
    // Allocate each activation once (prefer exact lot match; legacy product-only last).
    const remainingByLot = new Map<string, number>();
    const remainingByProduct = new Map<string, number>();
    for (const a of activations) {
      if (a.fgLotId) {
        remainingByLot.set(a.fgLotId, (remainingByLot.get(a.fgLotId) ?? 0) + a.quantity);
      } else if (a.fgProductId) {
        remainingByProduct.set(a.fgProductId, (remainingByProduct.get(a.fgProductId) ?? 0) + a.quantity);
      }
    }
    for (const [lotId, { productCode, productId, need }] of traNeedByLot) {
      const covered = remainingByLot.get(lotId) ?? 0;
      if (covered >= need) {
        remainingByLot.set(lotId, covered - need);
        continue;
      }
      const stillNeed = need - covered;
      remainingByLot.set(lotId, 0);
      const productPool = remainingByProduct.get(productId) ?? 0;
      if (productPool < stillNeed) {
        throw new Error(
          `TRA stamp activation required for ${productCode}: covered ${covered + productPool}, required ${need}`
        );
      }
      remainingByProduct.set(productId, productPool - stillNeed);
    }
  }

  const now = new Date();

  const updated = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const order = await tx.dispatchOrder.update({
      where: { id },
      data: { status: "DISPATCHED", dispatchedAt: now },
    });

    for (const line of existing.lines) {
      const lot = await tx.fGLot.findUnique({ where: { id: line.lotId! } });
      if (!lot) throw new Error(`Lot not found for line: ${line.description}`);
      const updatedLot = await tx.fGLot.updateMany({
        where: {
          id: line.lotId!,
          companyId,
          status: "AVAILABLE",
          qaStatus: "RELEASED",
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

      const refreshed = await tx.fGLot.findUnique({ where: { id: line.lotId! } });
      if (refreshed && refreshed.quantityOut >= refreshed.quantityIn) {
        await tx.fGLot.update({
          where: { id: line.lotId! },
          data: { status: "DEPLETED" },
        });
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

async function addLineTx(
  tx: Prisma.TransactionClient,
  companyId: string,
  orderId: string,
  data: CreateOrderLineInput & { description?: string | null }
) {
  if (!Number.isFinite(data.quantity) || data.quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }
  if (data.unitPrice != null && (!Number.isFinite(data.unitPrice) || data.unitPrice < 0)) {
    throw new Error("Unit price cannot be negative");
  }

  let productId = data.productId ?? null;
  let description = data.description?.trim() || "";
  let uom = data.uom?.trim() || "UNIT";

  if (data.lotId) {
    const lot = await tx.fGLot.findUnique({
      where: { id: data.lotId },
      include: { product: true },
    });
    if (!lot) throw new Error("Lot not found");
    if (lot.companyId !== companyId) throw new Error("Lot not found");
    if (lot.status !== "AVAILABLE") throw new Error("Lot is not available");
    const available = lot.quantityIn - lot.quantityOut;
    if (available < data.quantity) {
      throw new Error(
        `Insufficient quantity for lot${lot.lotNumber ? " " + lot.lotNumber : ""}: available ${available}, required ${data.quantity}`
      );
    }
    if (productId && productId !== lot.productId) {
      throw new Error("Selected product does not match the lot");
    }
    productId = lot.productId;
    if (!description) description = lot.product.name;
    if (!data.uom) uom = lot.product.uom || "UNIT";
  }

  if (!description) throw new Error("Description is required");

  if (productId) {
    const product = await tx.fGProduct.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");
    if (product.companyId !== companyId) throw new Error("Product not found");
    if (!product.isActive) throw new Error("Product is inactive");
    if (!data.uom) uom = product.uom || uom;
    if (!data.description) description = product.name;
  }

  const totalPrice =
    data.unitPrice !== undefined && data.unitPrice !== null
      ? data.quantity * data.unitPrice
      : null;

  return tx.dispatchOrderLine.create({
    data: {
      orderId,
      lotId: data.lotId ?? null,
      productId,
      description,
      quantity: data.quantity,
      uom,
      unitPrice: data.unitPrice ?? null,
      totalPrice,
    },
  });
}

export async function addLine(
  companyId: string,
  orderId: string,
  data: CreateOrderLineInput & { description?: string | null }
) {
  const order = await db.dispatchOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Dispatch order not found");
  if (order.companyId !== companyId) throw new Error("Dispatch order not found");
  if (order.status !== "DRAFT") throw new Error("Lines can only be added to DRAFT orders");

  return db.$transaction(async (tx: Prisma.TransactionClient) => addLineTx(tx, companyId, orderId, data));
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
