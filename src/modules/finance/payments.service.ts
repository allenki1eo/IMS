import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function generateRef(prefix: string): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export async function listPayments(
  companyId: string,
  params: {
    search?: string;
    type?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, type, status, fromDate, toDate, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(fromDate || toDate
      ? {
          paymentDate: {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate ? { lte: new Date(toDate) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { paymentNumber: { contains: search } },
            { partyName: { contains: search } },
            { reference: { contains: search } },
          ],
        }
      : {}),
  };

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { paymentDate: "desc" },
      include: {
        bankAccount: { select: { id: true, name: true } },
        _count: { select: { allocations: true } },
      },
    }),
    db.payment.count({ where }),
  ]);

  return { data: payments, meta: { total, page, pageSize } };
}

export async function getPayment(companyId: string, id: string) {
  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      bankAccount: { select: { id: true, name: true } },
      allocations: true,
    },
  });

  if (!payment || payment.companyId !== companyId) return null;
  return payment;
}

export async function createPayment(
  companyId: string,
  data: {
    type: string;
    partyName: string;
    amount: number;
    currency?: string;
    paymentDate: string;
    paymentMethod: string;
    bankAccountId?: string;
    reference?: string;
    notes?: string;
    allocations?: { documentType: string; documentId: string; amount: number }[];
  },
  userId: string,
  userName: string,
  ipAddress: string
) {
  if (data.bankAccountId) {
    const bank = await db.bankAccount.findUnique({ where: { id: data.bankAccountId } });
    if (!bank || bank.companyId !== companyId) throw new Error("Bank account not found");
  }

  const prefix = data.type === "RECEIPT" ? "RCPT" : "PAY";

  const payment = await db.payment.create({
    data: {
      companyId,
      paymentNumber: generateRef(prefix),
      type: data.type,
      partyName: data.partyName,
      amount: data.amount,
      currency: data.currency || "USD",
      paymentDate: new Date(data.paymentDate),
      paymentMethod: data.paymentMethod,
      bankAccountId: data.bankAccountId || null,
      reference: data.reference,
      notes: data.notes,
      status: "PENDING",
      allocations: data.allocations?.length
        ? { create: data.allocations }
        : undefined,
    },
    include: {
      bankAccount: { select: { id: true, name: true } },
      allocations: true,
    },
  });

  await createAuditLog({
    userId,
    userName,
    action: "PAYMENT_CREATE",
    module: "finance",
    resource: "payment",
    recordId: payment.id,
    newValue: { paymentNumber: payment.paymentNumber, type: payment.type, amount: payment.amount },
    description: `Created ${payment.type.toLowerCase()} ${payment.paymentNumber}`,
    ipAddress,
  });

  return payment;
}

export async function completePayment(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress: string
) {
  const payment = await db.payment.findUnique({ where: { id } });
  if (!payment || payment.companyId !== companyId) throw new Error("Payment not found");
  if (payment.status !== "PENDING") throw new Error("Only pending payments can be completed");

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id },
      data: { status: "COMPLETED" },
    });

    if (payment.bankAccountId) {
      const change = payment.type === "RECEIPT" ? payment.amount : -payment.amount;
      await tx.bankAccount.update({
        where: { id: payment.bankAccountId },
        data: { currentBalance: { increment: change } },
      });
    }
  });

  const updated = await db.payment.findUnique({
    where: { id },
    include: { bankAccount: true, allocations: true },
  });

  await createAuditLog({
    userId,
    userName,
    action: "PAYMENT_COMPLETE",
    module: "finance",
    resource: "payment",
    recordId: payment.id,
    oldValue: { status: "PENDING" },
    newValue: { status: "COMPLETED" },
    description: `Completed ${payment.type.toLowerCase()} ${payment.paymentNumber}`,
    ipAddress,
  });

  return updated;
}

export async function cancelPayment(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress: string
) {
  const payment = await db.payment.findUnique({ where: { id } });
  if (!payment || payment.companyId !== companyId) throw new Error("Payment not found");
  if (payment.status === "CANCELLED") throw new Error("Payment is already cancelled");

  await db.$transaction(async (tx) => {
    if (payment.status === "COMPLETED" && payment.bankAccountId) {
      // Reverse the bank balance change
      const change = payment.type === "RECEIPT" ? -payment.amount : payment.amount;
      await tx.bankAccount.update({
        where: { id: payment.bankAccountId },
        data: { currentBalance: { increment: change } },
      });
    }

    await tx.payment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  });

  const updated = await db.payment.findUnique({
    where: { id },
    include: { bankAccount: true, allocations: true },
  });

  await createAuditLog({
    userId,
    userName,
    action: "PAYMENT_CANCEL",
    module: "finance",
    resource: "payment",
    recordId: payment.id,
    oldValue: { status: payment.status },
    newValue: { status: "CANCELLED" },
    description: `Cancelled ${payment.type.toLowerCase()} ${payment.paymentNumber}`,
    ipAddress,
  });

  return updated;
}
