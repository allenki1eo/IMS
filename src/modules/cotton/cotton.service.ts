import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

// ─── Seasons ──────────────────────────────────────────────

export async function listSeasons(companyId: string) {
  return db.cottonSeason.findMany({
    where: { companyId },
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { bales: true, lots: true } },
    },
  });
}

export async function createSeason(
  companyId: string,
  data: { name: string; startDate: Date; endDate?: Date | null; isActive?: boolean },
  userId: string
) {
  const season = await db.cottonSeason.create({
    data: {
      companyId,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      isActive: data.isActive ?? true,
      createdById: userId,
    },
  });

  await createAuditLog({
    userId,
    userName: userId,
    action: "COTTON_SEASON_CREATE",
    module: "cotton",
    resource: "season",
    recordId: season.id,
    newValue: { name: data.name },
    description: `Created cotton season: ${data.name}`,
  });

  return season;
}

export async function getActiveSeason(companyId: string) {
  return db.cottonSeason.findFirst({
    where: { companyId, isActive: true },
    orderBy: { startDate: "desc" },
  });
}

// ─── Bales ────────────────────────────────────────────────

export async function listBales(
  companyId: string,
  params: {
    seasonId?: string;
    lotId?: string;
    search?: string;
    page?: number;
    limit?: number;
    unassigned?: boolean;
  }
) {
  const { seasonId, lotId, search, page = 1, limit = 20, unassigned } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { companyId };
  if (seasonId) where.seasonId = seasonId;
  if (unassigned) where.lotId = null;
  else if (lotId !== undefined) where.lotId = lotId === "null" ? null : lotId;
  if (search) {
    where.OR = [
      { baleNumber: { contains: search } },
      { ginnery: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    db.cottonBale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { baleNumber: "asc" },
      include: {
        season: { select: { id: true, name: true } },
        lot: { select: { id: true, lotNumber: true } },
      },
    }),
    db.cottonBale.count({ where }),
  ]);

  return { data, meta: { total, page, pageSize: limit } };
}

export async function createBale(
  companyId: string,
  data: {
    seasonId: string;
    baleNumber: string;
    weight: number;
    grade?: string;
    ginnery?: string;
    lotId?: string;
  },
  userId: string
) {
  const bale = await db.cottonBale.create({
    data: {
      companyId,
      seasonId: data.seasonId,
      baleNumber: data.baleNumber,
      weight: data.weight,
      grade: data.grade ?? "A",
      ginnery: data.ginnery ?? null,
      lotId: data.lotId ?? null,
      createdById: userId,
    },
  });

  await createAuditLog({
    userId,
    userName: userId,
    action: "COTTON_BALE_CREATE",
    module: "cotton",
    resource: "bale",
    recordId: bale.id,
    newValue: { baleNumber: data.baleNumber, weight: data.weight },
    description: `Created cotton bale: ${data.baleNumber}`,
  });

  return bale;
}

export async function bulkCreateBales(
  companyId: string,
  bales: Array<{
    seasonId: string;
    baleNumber: string;
    weight: number;
    grade?: string;
    ginnery?: string;
  }>,
  userId: string
) {
  const created = [];
  const errors: Array<{ baleNumber: string; error: string }> = [];

  for (const b of bales) {
    try {
      const bale = await db.cottonBale.create({
        data: {
          companyId,
          seasonId: b.seasonId,
          baleNumber: b.baleNumber,
          weight: b.weight,
          grade: b.grade ?? "A",
          ginnery: b.ginnery ?? null,
          createdById: userId,
        },
      });
      created.push(bale);
    } catch (err) {
      errors.push({
        baleNumber: b.baleNumber,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  if (created.length > 0) {
    await createAuditLog({
      userId,
      userName: userId,
      action: "COTTON_BALE_BULK_CREATE",
      module: "cotton",
      resource: "bale",
      recordId: companyId,
      newValue: { count: created.length },
      description: `Bulk created ${created.length} cotton bales`,
    });
  }

  return { created, errors };
}

// ─── Lots ─────────────────────────────────────────────────

export async function listLots(
  companyId: string,
  params: {
    seasonId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
) {
  const { seasonId, status, search, page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { companyId };
  if (seasonId) where.seasonId = seasonId;
  if (status && status !== "ALL") where.status = status;
  if (search) {
    where.OR = [
      { lotNumber: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    db.cottonLot.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        season: { select: { id: true, name: true } },
        _count: { select: { bales: true } },
      },
    }),
    db.cottonLot.count({ where }),
  ]);

  return { data, meta: { total, page, pageSize: limit } };
}

export async function getLot(companyId: string, lotId: string) {
  const lot = await db.cottonLot.findUnique({
    where: { id: lotId },
    include: {
      season: { select: { id: true, name: true } },
      bales: {
        orderBy: { baleNumber: "asc" },
      },
      contractLines: {
        include: {
          contract: {
            select: {
              id: true,
              contractNumber: true,
              status: true,
              pricePerKg: true,
              buyer: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!lot || lot.companyId !== companyId) return null;
  return lot;
}

export async function createLot(
  companyId: string,
  data: {
    seasonId: string;
    lotNumber: string;
    description?: string;
  },
  userId: string
) {
  const lot = await db.cottonLot.create({
    data: {
      companyId,
      seasonId: data.seasonId,
      lotNumber: data.lotNumber,
      description: data.description ?? null,
      status: "OPEN",
      createdById: userId,
    },
  });

  await createAuditLog({
    userId,
    userName: userId,
    action: "COTTON_LOT_CREATE",
    module: "cotton",
    resource: "lot",
    recordId: lot.id,
    newValue: { lotNumber: data.lotNumber },
    description: `Created cotton lot: ${data.lotNumber}`,
  });

  return lot;
}

export async function updateLot(
  companyId: string,
  lotId: string,
  data: { description?: string; status?: string },
  userId: string
) {
  const lot = await db.cottonLot.findUnique({ where: { id: lotId } });
  if (!lot || lot.companyId !== companyId) throw new Error("Lot not found");

  const updated = await db.cottonLot.update({
    where: { id: lotId },
    data: {
      description: data.description ?? lot.description,
      status: data.status ?? lot.status,
      updatedAt: new Date(),
    },
  });

  await createAuditLog({
    userId,
    userName: userId,
    action: "COTTON_LOT_UPDATE",
    module: "cotton",
    resource: "lot",
    recordId: lotId,
    newValue: data,
    description: `Updated cotton lot: ${lot.lotNumber}`,
  });

  return updated;
}

export async function addBalesToLot(
  companyId: string,
  lotId: string,
  baleIds: string[],
  userId: string
) {
  const lot = await db.cottonLot.findUnique({ where: { id: lotId } });
  if (!lot || lot.companyId !== companyId) throw new Error("Lot not found");
  if (lot.status !== "OPEN") throw new Error("Can only add bales to OPEN lots");

  // Validate all bales belong to this company and are unassigned
  const bales = await db.cottonBale.findMany({
    where: { id: { in: baleIds }, companyId, lotId: null },
  });

  if (bales.length !== baleIds.length) {
    throw new Error("Some bales not found or already assigned to a lot");
  }

  // Update bales to belong to this lot
  await db.cottonBale.updateMany({
    where: { id: { in: baleIds } },
    data: { lotId },
  });

  // Recalculate lot totals
  const allBales = await db.cottonBale.findMany({ where: { lotId } });
  const totalWeight = allBales.reduce((s, b) => s + b.weight, 0);

  const updated = await db.cottonLot.update({
    where: { id: lotId },
    data: { totalWeight, baleCount: allBales.length },
  });

  await createAuditLog({
    userId,
    userName: userId,
    action: "COTTON_LOT_ADD_BALES",
    module: "cotton",
    resource: "lot",
    recordId: lotId,
    newValue: { baleIds, count: baleIds.length },
    description: `Added ${baleIds.length} bales to lot: ${lot.lotNumber}`,
  });

  return updated;
}

export async function removeBaleFromLot(
  companyId: string,
  lotId: string,
  baleId: string,
  userId: string
) {
  const lot = await db.cottonLot.findUnique({ where: { id: lotId } });
  if (!lot || lot.companyId !== companyId) throw new Error("Lot not found");
  if (lot.status !== "OPEN") throw new Error("Can only remove bales from OPEN lots");

  const bale = await db.cottonBale.findUnique({ where: { id: baleId } });
  if (!bale || bale.lotId !== lotId) throw new Error("Bale not found in this lot");

  await db.cottonBale.update({
    where: { id: baleId },
    data: { lotId: null },
  });

  // Recalculate
  const remaining = await db.cottonBale.findMany({ where: { lotId } });
  const totalWeight = remaining.reduce((s, b) => s + b.weight, 0);

  const updated = await db.cottonLot.update({
    where: { id: lotId },
    data: { totalWeight, baleCount: remaining.length },
  });

  await createAuditLog({
    userId,
    userName: userId,
    action: "COTTON_LOT_REMOVE_BALE",
    module: "cotton",
    resource: "lot",
    recordId: lotId,
    newValue: { baleId },
    description: `Removed bale from lot: ${lot.lotNumber}`,
  });

  return updated;
}

// ─── Buyers ───────────────────────────────────────────────

export async function listBuyers(companyId: string, search?: string) {
  const where: Record<string, unknown> = { companyId };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { contactName: { contains: search } },
    ];
  }
  return db.cottonBuyer.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { contracts: true } } },
  });
}

export async function createBuyer(
  companyId: string,
  data: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    country?: string;
    taxNumber?: string;
  },
  userId: string
) {
  const buyer = await db.cottonBuyer.create({
    data: {
      companyId,
      name: data.name,
      contactName: data.contactName ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      country: data.country ?? null,
      taxNumber: data.taxNumber ?? null,
      createdById: userId,
    },
  });

  await createAuditLog({
    userId,
    userName: userId,
    action: "COTTON_BUYER_CREATE",
    module: "cotton",
    resource: "buyer",
    recordId: buyer.id,
    newValue: { name: data.name },
    description: `Created cotton buyer: ${data.name}`,
  });

  return buyer;
}

export async function getBuyer(companyId: string, buyerId: string) {
  const buyer = await db.cottonBuyer.findUnique({
    where: { id: buyerId },
    include: {
      contracts: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          contractNumber: true,
          status: true,
          pricePerKg: true,
          totalWeight: true,
          totalAmount: true,
          contractDate: true,
        },
      },
    },
  });
  if (!buyer || buyer.companyId !== companyId) return null;
  return buyer;
}

// ─── Contracts ────────────────────────────────────────────

export async function listContracts(
  companyId: string,
  params: {
    status?: string;
    buyerId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
) {
  const { status, buyerId, search, page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { companyId };
  if (status && status !== "ALL") where.status = status;
  if (buyerId) where.buyerId = buyerId;
  if (search) {
    where.OR = [{ contractNumber: { contains: search } }];
  }

  const [data, total] = await Promise.all([
    db.cottonContract.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { id: true, name: true } },
        _count: { select: { lines: true } },
      },
    }),
    db.cottonContract.count({ where }),
  ]);

  return { data, meta: { total, page, pageSize: limit } };
}

export async function getContract(companyId: string, contractId: string) {
  const contract = await db.cottonContract.findUnique({
    where: { id: contractId },
    include: {
      buyer: true,
      lines: {
        include: {
          lot: {
            include: {
              bales: true,
              season: { select: { id: true, name: true } },
            },
          },
        },
      },
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          issuedAt: true,
        },
      },
    },
  });
  if (!contract || contract.companyId !== companyId) return null;
  return contract;
}

export async function generateContractNumber(companyId: string) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `CCT-${ym}-`;

  const last = await db.cottonContract.findFirst({
    where: { companyId, contractNumber: { startsWith: prefix } },
    orderBy: { contractNumber: "desc" },
  });

  let seq = 1;
  if (last) {
    const parts = last.contractNumber.split("-");
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n)) seq = n + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function createContract(
  companyId: string,
  data: {
    buyerId: string;
    pricePerKg: number;
    currency?: string;
    lotIds: string[];
    notes?: string;
    contractDate?: Date;
  },
  userId: string
) {
  // Validate buyer
  const buyer = await db.cottonBuyer.findUnique({ where: { id: data.buyerId } });
  if (!buyer || buyer.companyId !== companyId) throw new Error("Buyer not found");

  // Validate lots
  const lots = await db.cottonLot.findMany({
    where: { id: { in: data.lotIds }, companyId, status: "OPEN" },
  });
  if (lots.length !== data.lotIds.length) {
    throw new Error("Some lots not found or not available (must be OPEN)");
  }

  const contractNumber = await generateContractNumber(companyId);
  const totalWeight = lots.reduce((s, l) => s + l.totalWeight, 0);
  const totalAmount = totalWeight * data.pricePerKg;

  const contract = await db.cottonContract.create({
    data: {
      companyId,
      contractNumber,
      buyerId: data.buyerId,
      pricePerKg: data.pricePerKg,
      currency: data.currency ?? "USD",
      totalWeight,
      totalAmount,
      notes: data.notes ?? null,
      contractDate: data.contractDate ?? new Date(),
      status: "DRAFT",
      createdById: userId,
      lines: {
        create: lots.map((lot) => ({
          lotId: lot.id,
          weight: lot.totalWeight,
          amount: lot.totalWeight * data.pricePerKg,
        })),
      },
    },
    include: {
      buyer: true,
      lines: { include: { lot: true } },
    },
  });

  // Mark lots as ASSIGNED
  await db.cottonLot.updateMany({
    where: { id: { in: data.lotIds } },
    data: { status: "ASSIGNED" },
  });

  await createAuditLog({
    userId,
    userName: userId,
    action: "COTTON_CONTRACT_CREATE",
    module: "cotton",
    resource: "contract",
    recordId: contract.id,
    newValue: { contractNumber, buyerId: data.buyerId, totalAmount },
    description: `Created cotton contract: ${contractNumber}`,
  });

  return contract;
}

export async function confirmContract(
  companyId: string,
  contractId: string,
  userId: string
) {
  const contract = await db.cottonContract.findUnique({ where: { id: contractId } });
  if (!contract || contract.companyId !== companyId) throw new Error("Contract not found");
  if (contract.status !== "DRAFT") throw new Error("Contract must be in DRAFT status to confirm");

  const updated = await db.cottonContract.update({
    where: { id: contractId },
    data: { status: "CONFIRMED" },
  });

  await createAuditLog({
    userId,
    userName: userId,
    action: "COTTON_CONTRACT_CONFIRM",
    module: "cotton",
    resource: "contract",
    recordId: contractId,
    description: `Confirmed cotton contract: ${contract.contractNumber}`,
  });

  return updated;
}

export async function cancelContract(
  companyId: string,
  contractId: string,
  userId: string
) {
  const contract = await db.cottonContract.findUnique({
    where: { id: contractId },
    include: { lines: { select: { lotId: true } } },
  });
  if (!contract || contract.companyId !== companyId) throw new Error("Contract not found");
  if (!["DRAFT", "CONFIRMED"].includes(contract.status)) {
    throw new Error("Cannot cancel this contract in its current state");
  }

  const lotIds = contract.lines.map((l) => l.lotId);

  // Release lots back to OPEN
  await db.cottonLot.updateMany({
    where: { id: { in: lotIds } },
    data: { status: "OPEN" },
  });

  const updated = await db.cottonContract.update({
    where: { id: contractId },
    data: { status: "CANCELLED" },
  });

  await createAuditLog({
    userId,
    userName: userId,
    action: "COTTON_CONTRACT_CANCEL",
    module: "cotton",
    resource: "contract",
    recordId: contractId,
    description: `Cancelled cotton contract: ${contract.contractNumber}`,
  });

  return updated;
}

// ─── Invoices ─────────────────────────────────────────────

async function generateInvoiceNumber(companyId: string) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `CINV-${ym}-`;

  const last = await db.cottonInvoice.findFirst({
    where: { companyId, invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
  });

  let seq = 1;
  if (last) {
    const parts = last.invoiceNumber.split("-");
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n)) seq = n + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function createInvoice(
  companyId: string,
  contractId: string,
  userId: string
) {
  const contract = await db.cottonContract.findUnique({
    where: { id: contractId },
    include: { lines: { include: { lot: true } } },
  });
  if (!contract || contract.companyId !== companyId) throw new Error("Contract not found");
  if (contract.status !== "CONFIRMED") throw new Error("Contract must be CONFIRMED to create an invoice");

  // Check if invoice already exists
  const existing = await db.cottonInvoice.findFirst({
    where: { contractId, status: { not: "CANCELLED" } },
  });
  if (existing) throw new Error("An active invoice already exists for this contract");

  const invoiceNumber = await generateInvoiceNumber(companyId);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await db.cottonInvoice.create({
    data: {
      companyId,
      invoiceNumber,
      contractId,
      buyerId: contract.buyerId,
      totalWeight: contract.totalWeight,
      pricePerKg: contract.pricePerKg,
      currency: contract.currency,
      totalAmount: contract.totalAmount,
      status: "DRAFT",
      dueDate,
      createdById: userId,
    },
  });

  // Update contract status and lots
  await db.cottonContract.update({
    where: { id: contractId },
    data: { status: "INVOICED" },
  });

  const lotIds = contract.lines.map((l) => l.lotId);
  await db.cottonLot.updateMany({
    where: { id: { in: lotIds } },
    data: { status: "INVOICED" },
  });

  await createAuditLog({
    userId,
    userName: userId,
    action: "COTTON_INVOICE_CREATE",
    module: "cotton",
    resource: "invoice",
    recordId: invoice.id,
    newValue: { invoiceNumber, contractId, totalAmount: contract.totalAmount },
    description: `Created cotton invoice: ${invoiceNumber}`,
  });

  return invoice;
}

export async function listInvoices(
  companyId: string,
  params: {
    status?: string;
    page?: number;
    limit?: number;
  }
) {
  const { status, page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { companyId };
  if (status && status !== "ALL") where.status = status;

  const [data, total] = await Promise.all([
    db.cottonInvoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        contract: {
          select: {
            id: true,
            contractNumber: true,
            buyer: { select: { id: true, name: true } },
          },
        },
      },
    }),
    db.cottonInvoice.count({ where }),
  ]);

  return { data, meta: { total, page, pageSize: limit } };
}

export async function getInvoice(companyId: string, invoiceId: string) {
  const invoice = await db.cottonInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      contract: {
        include: {
          buyer: true,
          lines: {
            include: {
              lot: {
                include: {
                  bales: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!invoice || invoice.companyId !== companyId) return null;
  return invoice;
}

export async function markInvoicePaid(
  companyId: string,
  invoiceId: string,
  userId: string
) {
  const invoice = await db.cottonInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.companyId !== companyId) throw new Error("Invoice not found");
  if (invoice.status !== "ISSUED" && invoice.status !== "DRAFT") {
    throw new Error("Invoice must be ISSUED or DRAFT to mark as paid");
  }

  const updated = await db.cottonInvoice.update({
    where: { id: invoiceId },
    data: { status: "PAID" },
  });

  await createAuditLog({
    userId,
    userName: userId,
    action: "COTTON_INVOICE_PAID",
    module: "cotton",
    resource: "invoice",
    recordId: invoiceId,
    description: `Marked cotton invoice as paid: ${invoice.invoiceNumber}`,
  });

  return updated;
}

export async function issueInvoice(
  companyId: string,
  invoiceId: string,
  userId: string
) {
  const invoice = await db.cottonInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.companyId !== companyId) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") throw new Error("Invoice must be in DRAFT status to issue");

  const updated = await db.cottonInvoice.update({
    where: { id: invoiceId },
    data: { status: "ISSUED", issuedAt: new Date() },
  });

  await createAuditLog({
    userId,
    userName: userId,
    action: "COTTON_INVOICE_ISSUE",
    module: "cotton",
    resource: "invoice",
    recordId: invoiceId,
    description: `Issued cotton invoice: ${invoice.invoiceNumber}`,
  });

  return updated;
}

// ─── Dashboard Stats ──────────────────────────────────────

export async function getCottonStats(companyId: string) {
  const activeSeason = await getActiveSeason(companyId);

  const [
    totalBales,
    totalWeight,
    openLots,
    assignedLots,
    invoicedLots,
    deliveredLots,
    contractStats,
    recentContracts,
  ] = await Promise.all([
    db.cottonBale.count({ where: { companyId } }),
    db.cottonBale.aggregate({ where: { companyId }, _sum: { weight: true } }),
    db.cottonLot.count({ where: { companyId, status: "OPEN" } }),
    db.cottonLot.count({ where: { companyId, status: "ASSIGNED" } }),
    db.cottonLot.count({ where: { companyId, status: "INVOICED" } }),
    db.cottonLot.count({ where: { companyId, status: "DELIVERED" } }),
    db.cottonContract.aggregate({
      where: { companyId, status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    db.cottonContract.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        buyer: { select: { id: true, name: true } },
        _count: { select: { lines: true } },
      },
    }),
  ]);

  return {
    activeSeason,
    totalBales,
    totalWeightKg: totalWeight._sum.weight ?? 0,
    lots: {
      open: openLots,
      assigned: assignedLots,
      invoiced: invoicedLots,
      delivered: deliveredLots,
    },
    contracts: {
      count: contractStats._count.id,
      totalValueUsd: contractStats._sum.totalAmount ?? 0,
    },
    recentContracts,
  };
}
