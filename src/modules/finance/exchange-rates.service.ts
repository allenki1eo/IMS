import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listExchangeRates(
  companyId: string,
  params: {
    fromCurrency?: string;
    toCurrency?: string;
    page: number;
    pageSize: number;
  }
) {
  const { fromCurrency, toCurrency, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(fromCurrency ? { fromCurrency } : {}),
    ...(toCurrency ? { toCurrency } : {}),
  };

  const [data, total] = await Promise.all([
    db.exchangeRate.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { effectiveDate: "desc" },
    }),
    db.exchangeRate.count({ where }),
  ]);

  return { data, meta: { total, page, pageSize } };
}

export async function getActiveRate(
  companyId: string,
  fromCurrency: string,
  toCurrency: string,
  date?: Date
) {
  const asOf = date ? new Date(date) : new Date();
  asOf.setHours(23, 59, 59, 999);

  const rate = await db.exchangeRate.findFirst({
    where: {
      companyId,
      fromCurrency,
      toCurrency,
      effectiveDate: { lte: asOf },
    },
    orderBy: { effectiveDate: "desc" },
  });

  return rate;
}

export async function convertAmount(
  companyId: string,
  fromCurrency: string,
  toCurrency: string,
  amount: number,
  date?: Date
) {
  if (fromCurrency === toCurrency) {
    return { convertedAmount: amount, rate: 1, rateDate: new Date() };
  }

  const rate = await getActiveRate(companyId, fromCurrency, toCurrency, date);
  if (!rate) {
    throw new Error(
      `No exchange rate found from ${fromCurrency} to ${toCurrency}`
    );
  }

  return {
    convertedAmount: amount * rate.rate,
    rate: rate.rate,
    rateDate: rate.effectiveDate,
  };
}

export async function createExchangeRate(params: {
  companyId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source?: string;
  effectiveDate?: Date | string;
  notes?: string | null;
  createdById: string;
  userName: string;
  ipAddress?: string;
}) {
  const {
    companyId,
    fromCurrency,
    toCurrency,
    rate,
    source,
    effectiveDate,
    notes,
    createdById,
    userName,
    ipAddress,
  } = params;

  const existing = await db.exchangeRate.findFirst({
    where: {
      companyId,
      fromCurrency,
      toCurrency,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
    },
  });

  if (existing) {
    throw new Error(
      `Exchange rate already exists for ${fromCurrency} → ${toCurrency} on this date`
    );
  }

  const record = await db.exchangeRate.create({
    data: {
      companyId,
      fromCurrency,
      toCurrency,
      rate,
      source: source ?? "MANUAL",
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      notes: notes ?? null,
      createdById,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "EXCHANGE_RATE_CREATE",
    module: "finance",
    resource: "exchange_rate",
    recordId: record.id,
    newValue: { fromCurrency, toCurrency, rate, source: record.source },
    description: `Created exchange rate: ${fromCurrency} → ${toCurrency} @ ${rate}`,
    ipAddress,
    companyId,
  });

  return record;
}

export async function updateExchangeRate(params: {
  id: string;
  companyId: string;
  rate?: number;
  source?: string;
  notes?: string | null;
  updatedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, companyId, rate, source, notes, updatedById, userName, ipAddress } =
    params;

  const existing = await db.exchangeRate.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId)
    throw new Error("Exchange rate not found");

  const updated = await db.exchangeRate.update({
    where: { id },
    data: {
      ...(rate !== undefined ? { rate } : {}),
      ...(source !== undefined ? { source } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "EXCHANGE_RATE_UPDATE",
    module: "finance",
    resource: "exchange_rate",
    recordId: id,
    oldValue: { rate: existing.rate, source: existing.source },
    newValue: { rate: updated.rate, source: updated.source },
    description: `Updated exchange rate: ${existing.fromCurrency} → ${existing.toCurrency}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function deleteExchangeRate(
  id: string,
  companyId: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.exchangeRate.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId)
    throw new Error("Exchange rate not found");

  await db.exchangeRate.delete({ where: { id } });

  await createAuditLog({
    userId,
    userName,
    action: "EXCHANGE_RATE_DELETE",
    module: "finance",
    resource: "exchange_rate",
    recordId: id,
    oldValue: { fromCurrency: existing.fromCurrency, toCurrency: existing.toCurrency, rate: existing.rate },
    description: `Deleted exchange rate: ${existing.fromCurrency} → ${existing.toCurrency}`,
    ipAddress,
    companyId,
  });
}
