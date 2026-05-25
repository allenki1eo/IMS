import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listPrices(
  params: {
    fuelType?: string;
  }
) {
  const { fuelType } = params;

  const where = {
    ...(fuelType ? { fuelType } : {}),
  };

  return db.fuelPrice.findMany({
    where,
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function getCurrentPrice(fuelType: string) {
  const now = new Date();

  return db.fuelPrice.findFirst({
    where: {
      fuelType,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function createPrice(params: {
  companyId: string;
  fuelType: string;
  pricePerLiter: number;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  notes?: string | null;
  recordedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { recordedById, userName, ipAddress, ...data } = params;

  const price = await db.fuelPrice.create({
    data: {
      companyId: data.companyId,
      fuelType: data.fuelType,
      pricePerLiter: data.pricePerLiter,
      effectiveFrom: new Date(data.effectiveFrom),
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      notes: data.notes ?? null,
      recordedById,
    },
  });

  await createAuditLog({
    userId: recordedById,
    userName,
    action: "FUEL_PRICE_RECORDED",
    module: "fuel",
    resource: "price",
    recordId: price.id,
    newValue: {
      fuelType: data.fuelType,
      pricePerLiter: data.pricePerLiter,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ?? null,
    },
    description: `Recorded ${data.fuelType} price: ${data.pricePerLiter}/L effective from ${new Date(data.effectiveFrom).toISOString().slice(0, 10)}`,
    ipAddress,
    companyId: data.companyId,
  });

  return price;
}
