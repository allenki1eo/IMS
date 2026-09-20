import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { generateDatedRef } from "@/lib/timezone";

function generateRef(prefix: string): string {
  return generateDatedRef(prefix);
}

async function upsertStockBalance(params: {
  itemId: string;
  warehouseId: string;
  locationId: string | null;
  delta: number;
}) {
  const { itemId, warehouseId, locationId, delta } = params;

  const existing = await db.stockBalance.findFirst({
    where: { itemId, warehouseId, locationId: locationId ?? null },
  });

  if (existing) {
    const next = existing.quantity + delta;
    if (next < 0) {
      throw new Error(
        `Insufficient stock: available ${existing.quantity}, change ${delta}`
      );
    }
    await db.stockBalance.update({
      where: { id: existing.id },
      data: { quantity: next },
    });
    return next;
  } else {
    if (delta < 0) {
      throw new Error(`Insufficient stock: available 0, change ${delta}`);
    }
    await db.stockBalance.create({
      data: { itemId, warehouseId, locationId: locationId ?? null, quantity: delta },
    });
    return delta;
  }
}

export async function listTransfers(
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
    ...(search
      ? {
          OR: [{ reference: { contains: search } }, { notes: { contains: search } }],
        }
      : {}),
    ...(status ? { status } : {}),
  };

  const [transfers, total] = await Promise.all([
    db.stockTransfer.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        fromWarehouse: { select: { id: true, name: true, code: true } },
        toWarehouse: { select: { id: true, name: true, code: true } },
        _count: { select: { lines: true } },
      },
    }),
    db.stockTransfer.count({ where }),
  ]);

  return { transfers, total };
}

export async function getTransferById(id: string) {
  return db.stockTransfer.findUnique({
    where: { id },
    include: {
      fromWarehouse: { select: { id: true, name: true, code: true } },
      toWarehouse: { select: { id: true, name: true, code: true } },
      lines: {
        include: {
          item: { select: { id: true, name: true, code: true, uom: { select: { symbol: true } } } },
          fromLocation: { select: { id: true, name: true, code: true } },
          toLocation: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
}

export async function createTransfer(params: {
  companyId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  notes?: string | null;
  lines: {
    itemId: string;
    fromLocationId?: string | null;
    toLocationId?: string | null;
    quantity: number;
  }[];
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const {
    companyId,
    fromWarehouseId,
    toWarehouseId,
    notes,
    lines,
    createdById,
    userName,
    ipAddress,
    userAgent,
  } = params;

  // Validate source stock is sufficient for each line — bulk fetch to avoid N+1
  const itemIds = lines.map((l) => l.itemId);
  const [allBalances, allItems] = await Promise.all([
    db.stockBalance.findMany({
      where: { itemId: { in: itemIds }, warehouseId: fromWarehouseId },
    }),
    db.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, name: true, code: true },
    }),
  ]);
  const balanceMap = new Map<string, number>();
  for (const b of allBalances) {
    balanceMap.set(b.itemId, (balanceMap.get(b.itemId) ?? 0) + b.quantity);
  }
  const itemMap = new Map(allItems.map((i) => [i.id, i]));

  for (const line of lines) {
    const totalAvailable = balanceMap.get(line.itemId) ?? 0;
    if (totalAvailable < line.quantity) {
      const item = itemMap.get(line.itemId);
      throw new Error(
        `Insufficient stock for item ${item?.name ?? line.itemId}: available ${totalAvailable}, requested ${line.quantity}`
      );
    }
  }

  const reference = generateRef("TRF");

  const transfer = await db.stockTransfer.create({
    data: {
      companyId,
      fromWarehouseId,
      toWarehouseId,
      reference,
      notes: notes ?? null,
      status: "DRAFT",
      createdById,
      lines: {
        create: lines.map((line) => ({
          itemId: line.itemId,
          fromLocationId: line.fromLocationId ?? null,
          toLocationId: line.toLocationId ?? null,
          quantity: line.quantity,
        })),
      },
    },
    include: { lines: true },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "TRANSFER_CREATE",
    module: "warehouse",
    resource: "transfer",
    recordId: transfer.id,
    newValue: { reference, fromWarehouseId, toWarehouseId, lineCount: lines.length },
    description: `Created stock transfer: ${reference}`,
    ipAddress,
    userAgent,
    companyId,
  });

  return transfer;
}

export async function dispatchTransfer(
  id: string,
  dispatchedById: string,
  userName: string,
  ipAddress?: string,
  userAgent?: string
) {
  const transfer = await db.stockTransfer.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!transfer) throw new Error("Transfer not found");
  if (transfer.status !== "DRAFT") throw new Error("Only DRAFT transfers can be dispatched");

  // Re-validate source stock at dispatch time (draft may have sat while other issues depleted stock)
  const itemIds = transfer.lines.map((l) => l.itemId);
  const [balances, items] = await Promise.all([
    db.stockBalance.findMany({
      where: { itemId: { in: itemIds }, warehouseId: transfer.fromWarehouseId },
    }),
    db.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, name: true },
    }),
  ]);
  const availableByItem = new Map<string, number>();
  for (const b of balances) {
    availableByItem.set(b.itemId, (availableByItem.get(b.itemId) ?? 0) + b.quantity);
  }
  const needByItem = new Map<string, number>();
  for (const line of transfer.lines) {
    needByItem.set(line.itemId, (needByItem.get(line.itemId) ?? 0) + line.quantity);
  }
  const itemName = new Map(items.map((i) => [i.id, i.name]));
  for (const [itemId, need] of needByItem) {
    const available = availableByItem.get(itemId) ?? 0;
    if (available < need) {
      throw new Error(
        `Insufficient stock for item ${itemName.get(itemId) ?? itemId}: available ${available}, requested ${need}`
      );
    }
  }

  const now = new Date();

  // Atomic: status flip + stock deductions so a mid-loop failure cannot leave DISPATCHED with partial ledger
  await db.$transaction(async (tx) => {
    await tx.stockTransfer.update({
      where: { id },
      data: { status: "DISPATCHED", dispatchedAt: now },
    });

    for (const line of transfer.lines) {
      const existing = await tx.stockBalance.findFirst({
        where: {
          itemId: line.itemId,
          warehouseId: transfer.fromWarehouseId,
          locationId: line.fromLocationId ?? null,
        },
      });
      const current = existing?.quantity ?? 0;
      if (current < line.quantity) {
        throw new Error(
          `Insufficient stock for item ${itemName.get(line.itemId) ?? line.itemId}: available ${current}, requested ${line.quantity}`
        );
      }
      const balanceAfter = current - line.quantity;
      if (existing) {
        await tx.stockBalance.update({
          where: { id: existing.id },
          data: { quantity: balanceAfter },
        });
      } else {
        throw new Error(
          `Insufficient stock for item ${itemName.get(line.itemId) ?? line.itemId}: available 0, requested ${line.quantity}`
        );
      }

      await tx.stockLedger.create({
        data: {
          companyId: transfer.companyId,
          itemId: line.itemId,
          warehouseId: transfer.fromWarehouseId,
          locationId: line.fromLocationId,
          transactionType: "TRANSFER_OUT",
          quantity: line.quantity,
          balanceAfter,
          referenceType: "TRANSFER",
          referenceId: transfer.id,
          notes: `Transfer dispatched: ${transfer.reference}`,
          createdById: dispatchedById,
        },
      });
    }
  });

  await createAuditLog({
    userId: dispatchedById,
    userName,
    action: "TRANSFER_DISPATCH",
    module: "warehouse",
    resource: "transfer",
    recordId: id,
    oldValue: { status: "DRAFT" },
    newValue: { status: "DISPATCHED" },
    description: `Dispatched stock transfer: ${transfer.reference}`,
    ipAddress,
    userAgent,
    companyId: transfer.companyId,
  });

  return db.stockTransfer.findUnique({
    where: { id },
    include: {
      fromWarehouse: { select: { id: true, name: true } },
      toWarehouse: { select: { id: true, name: true } },
      lines: {
        include: {
          item: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
}

export async function receiveTransfer(
  id: string,
  receivedById: string,
  userName: string,
  ipAddress?: string,
  userAgent?: string
) {
  const transfer = await db.stockTransfer.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!transfer) throw new Error("Transfer not found");
  if (transfer.status !== "DISPATCHED")
    throw new Error("Only DISPATCHED transfers can be received");

  const now = new Date();

  await db.stockTransfer.update({
    where: { id },
    data: { status: "RECEIVED", receivedAt: now },
  });

  // Add to destination warehouse and create TRANSFER_IN ledger entries (parallel)
  await Promise.all(
    transfer.lines.map(async (line) => {
      const balanceAfter = await upsertStockBalance({
        itemId: line.itemId,
        warehouseId: transfer.toWarehouseId,
        locationId: line.toLocationId,
        delta: line.quantity,
      });

      await db.stockLedger.create({
        data: {
          companyId: transfer.companyId,
          itemId: line.itemId,
          warehouseId: transfer.toWarehouseId,
          locationId: line.toLocationId,
          transactionType: "TRANSFER_IN",
          quantity: line.quantity,
          balanceAfter,
          referenceType: "TRANSFER",
          referenceId: transfer.id,
          notes: `Transfer received: ${transfer.reference}`,
          createdById: receivedById,
        },
      });
    })
  );

  await createAuditLog({
    userId: receivedById,
    userName,
    action: "TRANSFER_RECEIVE",
    module: "warehouse",
    resource: "transfer",
    recordId: id,
    oldValue: { status: "DISPATCHED" },
    newValue: { status: "RECEIVED" },
    description: `Received stock transfer: ${transfer.reference}`,
    ipAddress,
    userAgent,
    companyId: transfer.companyId,
  });

  return db.stockTransfer.findUnique({
    where: { id },
    include: {
      fromWarehouse: { select: { id: true, name: true } },
      toWarehouse: { select: { id: true, name: true } },
      lines: {
        include: {
          item: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
}
