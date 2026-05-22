import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { convertAmount } from "@/modules/finance/exchange-rates.service";

function generateRef(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `PO-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

type OrderLineInput = {
  itemId?: string | null;
  itemCode?: string | null;
  description: string;
  quantity: number;
  uom?: string;
  unitCost: number;
};

type PurchaseRequestLineForOrder = {
  itemId: string | null;
  itemCode: string | null;
  description: string;
  quantity: number;
  uom: string;
  estimatedUnitCost: number | null;
};

type PurchaseRequestForOrder = {
  companyId: string;
  status: string;
  lines: PurchaseRequestLineForOrder[];
};

type PurchaseOrderLineForReceive = {
  id: string;
  quantity: number;
  receivedQty: number;
};

type PurchaseOrderForReceive = {
  companyId: string;
  status: string;
  reference: string;
  lines: PurchaseOrderLineForReceive[];
};

function computeTotals(lines: OrderLineInput[], taxAmount = 0) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
  return { subtotal, taxAmount, totalAmount: subtotal + taxAmount };
}

async function getApprovedPurchaseRequestForOrder(companyId: string, requestId: string): Promise<PurchaseRequestForOrder> {
  const request = await db.purchaseRequest.findUnique({
    where: { id: requestId },
    include: { lines: true },
  }) as PurchaseRequestForOrder | null;
  if (!request) throw new Error("Purchase request not found");
  if (request.companyId !== companyId) throw new Error("Purchase request not found");
  if (request.status !== "APPROVED") {
    throw new Error("Only approved purchase requests can be converted");
  }
  if (!request.lines.length) throw new Error("Purchase request has no lines");
  return request;
}

function orderLinesFromRequest(request: PurchaseRequestForOrder): OrderLineInput[] {
  return request.lines.map((line) => ({
    itemId: line.itemId,
    itemCode: line.itemCode,
    description: line.description,
    quantity: line.quantity,
    uom: line.uom,
    unitCost: line.estimatedUnitCost ?? 0,
  }));
}

export async function listPurchaseOrders(
  companyId: string,
  params: {
    search?: string;
    status?: string;
    supplierId?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, status, supplierId, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(supplierId ? { supplierId } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search } },
            { supplier: { name: { contains: search } } },
            { supplier: { code: { contains: search } } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        request: { select: { id: true, reference: true } },
        _count: { select: { lines: true } },
      },
    }),
    db.purchaseOrder.count({ where }),
  ]);

  return { data, meta: { total, page, pageSize } };
}

export async function getPurchaseOrder(companyId: string, id: string) {
  const order = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      request: { select: { id: true, reference: true, purpose: true, status: true } },
      lines: true,
    },
  });
  if (!order) return null;
  if (order.companyId !== companyId) return null;
  return order;
}

export async function createPurchaseOrder(
  companyId: string,
  data: {
    supplierId: string;
    requestId?: string | null;
    expectedDelivery?: Date | string | null;
    taxAmount?: number;
    currency?: string;
    exchangeRate?: number | null;
    baseCurrencyAmount?: number | null;
    notes?: string | null;
    lines?: OrderLineInput[];
  },
  createdById: string,
  userName: string,
  ipAddress?: string
) {
  const supplier = await db.supplier.findUnique({ where: { id: data.supplierId } });
  if (!supplier) throw new Error("Supplier not found");
  if (supplier.companyId !== companyId) throw new Error("Supplier not found");
  if (supplier.status !== "ACTIVE") throw new Error("Supplier is inactive");

  let request: PurchaseRequestForOrder | null = null;
  if (data.requestId) {
    request = await getApprovedPurchaseRequestForOrder(companyId, data.requestId);
  }

  const orderLines = data.lines?.length ? data.lines : request ? orderLinesFromRequest(request) : [];
  if (!orderLines.length) throw new Error("At least one line is required");

  const reference = generateRef();
  const totals = computeTotals(orderLines, data.taxAmount ?? 0);
  const currency = data.currency ?? "TZS";
  let exchangeRate = data.exchangeRate ?? null;
  let baseCurrencyAmount = data.baseCurrencyAmount ?? null;

  if (currency !== "TZS" && !exchangeRate) {
    const conversion = await convertAmount(companyId, currency, "TZS", totals.totalAmount);
    exchangeRate = conversion.rate;
    baseCurrencyAmount = conversion.convertedAmount;
  }

  const order = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.purchaseOrder.create({
      data: {
        companyId,
        supplierId: data.supplierId,
        requestId: data.requestId ?? null,
        reference,
        expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        currency,
        exchangeRate,
        baseCurrencyAmount,
        notes: data.notes ?? null,
        createdById,
        lines: {
          create: orderLines.map((line) => ({
            itemId: line.itemId ?? null,
            itemCode: line.itemCode ?? null,
            description: line.description,
            quantity: line.quantity,
            uom: line.uom ?? "PCS",
            unitCost: line.unitCost,
            totalCost: line.quantity * line.unitCost,
          })),
        },
      },
      include: { lines: true, supplier: true },
    });

    if (data.requestId) {
      await tx.purchaseRequest.update({
        where: { id: data.requestId },
        data: { status: "CONVERTED" },
      });
    }

    return created;
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "PURCHASE_ORDER_CREATE",
    module: "procurement",
    resource: "order",
    recordId: order.id,
    newValue: { reference, supplierId: data.supplierId, totalAmount: totals.totalAmount },
    description: `Created purchase order: ${reference}`,
    ipAddress,
    companyId,
  });

  return order;
}

export async function sendPurchaseOrder(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.purchaseOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Purchase order not found");
  if (existing.companyId !== companyId) throw new Error("Purchase order not found");
  if (existing.status !== "DRAFT") throw new Error("Only DRAFT orders can be sent");

  const updated = await db.purchaseOrder.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
  });

  await createAuditLog({
    userId,
    userName,
    action: "PURCHASE_ORDER_SEND",
    module: "procurement",
    resource: "order",
    recordId: id,
    oldValue: { status: "DRAFT" },
    newValue: { status: "SENT" },
    description: `Sent purchase order: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function receivePurchaseOrder(
  companyId: string,
  id: string,
  lines: { lineId: string; receivedQty: number }[],
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.purchaseOrder.findUnique({
    where: { id },
    include: { lines: true },
  }) as PurchaseOrderForReceive | null;
  if (!existing) throw new Error("Purchase order not found");
  if (existing.companyId !== companyId) throw new Error("Purchase order not found");
  if (!["SENT", "PARTIALLY_RECEIVED"].includes(existing.status)) {
    throw new Error("Only sent orders can be received");
  }

  const lineById = new Map(existing.lines.map((line) => [line.id, line]));
  for (const line of lines) {
    const existingLine = lineById.get(line.lineId);
    if (!existingLine) throw new Error("Purchase order line not found");
    if (line.receivedQty < 0 || line.receivedQty > existingLine.quantity) {
      throw new Error("Received quantity is invalid");
    }
  }

  const updated = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const line of lines) {
      await tx.purchaseOrderLine.update({
        where: { id: line.lineId },
        data: { receivedQty: line.receivedQty },
      });
    }

    const refreshedLines = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId: id } }) as PurchaseOrderLineForReceive[];
    const allReceived = refreshedLines.every((line) => line.receivedQty >= line.quantity);
    const anyReceived = refreshedLines.some((line) => line.receivedQty > 0);

    return tx.purchaseOrder.update({
      where: { id },
      data: {
        status: allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : "SENT",
        receivedAt: allReceived ? new Date() : null,
      },
      include: { lines: true, supplier: true },
    });
  });

  await createAuditLog({
    userId,
    userName,
    action: "PURCHASE_ORDER_RECEIVE",
    module: "procurement",
    resource: "order",
    recordId: id,
    oldValue: { status: existing.status },
    newValue: { status: updated.status, lines },
    description: `Received purchase order: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

