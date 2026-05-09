import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listReceipts(
  companyId: string,
  params: {
    sparePartId?: string;
    page: number;
    pageSize: number;
  }
) {
  const { sparePartId, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    transactionType: "RECEIPT",
    ...(sparePartId ? { sparePartId } : {}),
  };

  const [receipts, total] = await Promise.all([
    db.sparePartTransaction.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        sparePart: {
          select: {
            id: true,
            code: true,
            name: true,
            uom: true,
            currentStock: true,
            category: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    }),
    db.sparePartTransaction.count({ where }),
  ]);

  return { data: receipts, meta: { total, page, pageSize } };
}

export async function getReceipt(companyId: string, id: string) {
  const receipt = await db.sparePartTransaction.findUnique({
    where: { id },
    include: {
      sparePart: {
        select: {
          id: true,
          code: true,
          name: true,
          uom: true,
          currentStock: true,
          category: {
            select: { id: true, name: true, code: true },
          },
        },
      },
    },
  });

  if (!receipt) return null;
  if (receipt.companyId !== companyId) return null;
  if (receipt.transactionType !== "RECEIPT") return null;
  return receipt;
}

export async function receiveStock(
  companyId: string,
  data: {
    sparePartId: string;
    quantity: number;
    unitCost?: number | null;
    reference?: string | null;
    notes?: string | null;
    workOrderId?: string | null;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const part = await db.sparePart.findUnique({ where: { id: data.sparePartId } });
  if (!part) throw new Error("Spare part not found");
  if (part.companyId !== companyId) throw new Error("Spare part not found");

  const totalCost =
    data.unitCost != null ? data.quantity * data.unitCost : null;

  const newStock = part.currentStock + data.quantity;

  const transaction = await db.$transaction(async (tx) => {
    const created = await tx.sparePartTransaction.create({
      data: {
        companyId,
        sparePartId: data.sparePartId,
        transactionType: "RECEIPT",
        quantity: data.quantity,
        unitCost: data.unitCost ?? null,
        totalCost,
        referenceType: data.workOrderId ? "WORK_ORDER" : (data.reference ? "MANUAL" : null),
        referenceId: data.workOrderId ?? null,
        notes: data.notes ?? (data.reference ? `Ref: ${data.reference}` : null),
        createdById: userId,
      },
    });

    await tx.sparePart.update({
      where: { id: data.sparePartId },
      data: { currentStock: newStock },
    });

    return created;
  });

  await createAuditLog({
    userId,
    userName,
    action: "SPARE_PART_RECEIPT",
    module: "maintenance",
    resource: "spare_part_transaction",
    recordId: transaction.id,
    newValue: {
      sparePartId: data.sparePartId,
      partName: part.name,
      quantity: data.quantity,
      stockBefore: part.currentStock,
      stockAfter: newStock,
    },
    description: `Received ${data.quantity} ${part.uom} of ${part.name} (${part.code}). Stock: ${part.currentStock} → ${newStock}`,
    ipAddress,
    companyId,
  });

  return db.sparePartTransaction.findUnique({
    where: { id: transaction.id },
    include: {
      sparePart: {
        select: {
          id: true,
          code: true,
          name: true,
          uom: true,
          currentStock: true,
        },
      },
    },
  });
}
