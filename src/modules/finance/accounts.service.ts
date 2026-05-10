import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listAccounts(
  companyId: string,
  params: {
    search?: string;
    accountType?: string;
    isActive?: boolean;
    page: number;
    pageSize: number;
  }
) {
  const { search, accountType, isActive, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(accountType ? { accountType } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search } },
            { name: { contains: search } },
          ],
        }
      : {}),
  };

  const [accounts, total] = await Promise.all([
    db.account.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { code: "asc" },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        _count: { select: { children: true, lines: true } },
      },
    }),
    db.account.count({ where }),
  ]);

  return { data: accounts, meta: { total, page, pageSize } };
}

export async function getAccount(companyId: string, id: string) {
  const account = await db.account.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, code: true, name: true } },
      children: { select: { id: true, code: true, name: true, isActive: true } },
      lines: {
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          journalEntry: { select: { id: true, reference: true, entryDate: true, status: true } },
        },
      },
    },
  });

  if (!account || account.companyId !== companyId) return null;
  return account;
}

export async function createAccount(
  companyId: string,
  data: {
    code: string;
    name: string;
    accountType: string;
    parentId?: string;
    description?: string;
    openingBalance?: number;
  },
  userId: string,
  userName: string,
  ipAddress: string
) {
  const existing = await db.account.findUnique({
    where: { companyId_code: { companyId, code: data.code } },
  });
  if (existing) throw new Error("Account code already exists");

  if (data.parentId) {
    const parent = await db.account.findUnique({ where: { id: data.parentId } });
    if (!parent || parent.companyId !== companyId) throw new Error("Parent account not found");
  }

  const openingBalance = data.openingBalance ?? 0;

  const account = await db.account.create({
    data: {
      companyId,
      code: data.code,
      name: data.name,
      accountType: data.accountType,
      parentId: data.parentId || null,
      description: data.description,
      openingBalance,
      currentBalance: openingBalance,
    },
  });

  await createAuditLog({
    userId,
    userName,
    action: "ACCOUNT_CREATE",
    module: "finance",
    resource: "account",
    recordId: account.id,
    newValue: { code: account.code, name: account.name, accountType: account.accountType },
    description: `Created account ${account.code} - ${account.name}`,
    ipAddress,
  });

  return account;
}

export async function updateAccount(
  companyId: string,
  id: string,
  data: {
    name?: string;
    description?: string;
    parentId?: string | null;
    openingBalance?: number;
  },
  userId: string,
  userName: string,
  ipAddress: string
) {
  const existing = await db.account.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId) throw new Error("Account not found");

  if (data.parentId && data.parentId === id) throw new Error("Account cannot be its own parent");

  const oldValue = { name: existing.name, description: existing.description, openingBalance: existing.openingBalance };

  const updateData: any = { ...data };
  if (data.openingBalance !== undefined) {
    updateData.currentBalance = data.openingBalance + (existing.currentBalance - existing.openingBalance);
  }

  const account = await db.account.update({
    where: { id },
    data: updateData,
  });

  await createAuditLog({
    userId,
    userName,
    action: "ACCOUNT_UPDATE",
    module: "finance",
    resource: "account",
    recordId: account.id,
    oldValue,
    newValue: { name: account.name, description: account.description, openingBalance: account.openingBalance },
    description: `Updated account ${account.code} - ${account.name}`,
    ipAddress,
  });

  return account;
}

export async function toggleAccountStatus(
  companyId: string,
  id: string,
  isActive: boolean,
  userId: string,
  userName: string,
  ipAddress: string
) {
  const existing = await db.account.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId) throw new Error("Account not found");

  const account = await db.account.update({
    where: { id },
    data: { isActive },
  });

  await createAuditLog({
    userId,
    userName,
    action: isActive ? "ACCOUNT_ACTIVATE" : "ACCOUNT_DEACTIVATE",
    module: "finance",
    resource: "account",
    recordId: account.id,
    oldValue: { isActive: existing.isActive },
    newValue: { isActive: account.isActive },
    description: `${isActive ? "Activated" : "Deactivated"} account ${account.code}`,
    ipAddress,
  });

  return account;
}
