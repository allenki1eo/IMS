import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function generateRef(prefix: string): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export async function listReceipts(
  companyId: string,
  params: {
    search?: string;
    tankId?: string;
    status?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, tankId, status, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(tankId ? { tankId } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search } },
            { supplierName: { contains: search } },
            { deliveryNoteRef: { contains: search } },
          ],
        }
      : {}),
  };

  const [receipts, total] = await Promise.all([
    db.fuelReceipt.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        tank: {
          select: { id: true, name: true, code: true, fuelType: true },
        },
      },
    }),
    db.fuelReceipt.count({ where }),
  ]);

  return { data: receipts, meta: { total, page, pageSize } };
}

export async function getReceiptById(id: string) {
  return db.fuelReceipt.findUnique({
    where: { id },
    include: {
      tank: {
        select: { id: true, name: true, code: true, fuelType: true, capacity: true, currentLevel: true },
      },
    },
  });
}

export async function createReceipt(params: {
  companyId: string;
  tankId: string;
  supplierName?: string | null;
  deliveryNoteRef?: string | null;
  quantityLiters: number;
  pricePerLiter?: number | null;
  notes?: string | null;
  createdById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { createdById, userName, ipAddress, ...data } = params;

  const tank = await db.fuelTank.findUnique({ where: { id: data.tankId } });
  if (!tank) throw new Error("Fuel tank not found");
  if (tank.companyId !== data.companyId) throw new Error("Fuel tank not found");

  const reference = generateRef("FRC");
  const totalCost =
    data.quantityLiters != null && data.pricePerLiter != null
      ? data.quantityLiters * data.pricePerLiter
      : null;

  const receipt = await db.fuelReceipt.create({
    data: {
      companyId: data.companyId,
      tankId: data.tankId,
      reference,
      supplierName: data.supplierName ?? null,
      deliveryNoteRef: data.deliveryNoteRef ?? null,
      quantityLiters: data.quantityLiters,
      pricePerLiter: data.pricePerLiter ?? null,
      totalCost,
      status: "DRAFT",
      notes: data.notes ?? null,
      receivedById: createdById,
      createdById,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "FUEL_RECEIPT_CREATE",
    module: "fuel",
    resource: "receipt",
    recordId: receipt.id,
    newValue: {
      reference,
      tankId: data.tankId,
      quantityLiters: data.quantityLiters,
      supplierName: data.supplierName ?? null,
    },
    description: `Created fuel receipt: ${reference}`,
    ipAddress,
    companyId: data.companyId,
  });

  return receipt;
}

export async function confirmReceipt(
  id: string,
  confirmedById: string,
  userName: string,
  ipAddress?: string
) {
  const receipt = await db.fuelReceipt.findUnique({ where: { id } });
  if (!receipt) throw new Error("Fuel receipt not found");
  if (receipt.status !== "DRAFT") throw new Error("Only DRAFT receipts can be confirmed");

  const tank = await db.fuelTank.findUnique({ where: { id: receipt.tankId } });
  if (!tank) throw new Error("Fuel tank not found");

  const now = new Date();
  const newLevel = Math.min(tank.currentLevel + receipt.quantityLiters, tank.capacity);

  // Update receipt status and update tank level in a transaction
  const [updated] = await db.$transaction([
    db.fuelReceipt.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        confirmedById,
        confirmedAt: now,
      },
    }),
    db.fuelTank.update({
      where: { id: tank.id },
      data: { currentLevel: newLevel },
    }),
  ]);

  await createAuditLog({
    userId: confirmedById,
    userName,
    action: "FUEL_RECEIPT_CONFIRMED",
    module: "fuel",
    resource: "receipt",
    recordId: id,
    oldValue: { status: "DRAFT", tankLevel: tank.currentLevel },
    newValue: { status: "CONFIRMED", tankLevel: newLevel },
    description: `Confirmed fuel receipt: ${receipt.reference} — tank level updated from ${tank.currentLevel}L to ${newLevel}L`,
    ipAddress,
    companyId: receipt.companyId,
  });

  return db.fuelReceipt.findUnique({
    where: { id },
    include: {
      tank: {
        select: { id: true, name: true, code: true, fuelType: true, currentLevel: true, capacity: true },
      },
    },
  });
}
