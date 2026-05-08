import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listBranches(params: {
  companyId: string;
  search?: string;
  status?: string;
}) {
  const { companyId, search, status } = params;
  return db.branch.findMany({
    where: {
      companyId,
      ...(search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : {}),
      ...(status === "active" ? { isActive: true } : {}),
      ...(status === "inactive" ? { isActive: false } : {}),
    },
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
    include: { _count: { select: { employees: true, departments: true } } },
  });
}

export async function getBranchById(id: string) {
  return db.branch.findUnique({
    where: { id },
    include: {
      departments: { where: { isActive: true }, orderBy: { name: "asc" } },
      _count: { select: { employees: true } },
    },
  });
}

export async function createBranch(params: {
  companyId: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  isMain?: boolean;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { createdById, userName, ipAddress, userAgent, ...data } = params;

  const branch = await db.branch.create({
    data: { ...data, createdById },
    select: { id: true, name: true, code: true, isMain: true, createdAt: true },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "BRANCH_CREATE",
    module: "company",
    resource: "branch",
    recordId: branch.id,
    newValue: { name: data.name, code: data.code },
    description: `Created branch: ${data.name}`,
    ipAddress,
    userAgent,
    companyId: data.companyId,
  });

  return branch;
}

export async function updateBranch(params: {
  id: string;
  data: { name?: string; address?: string | null; city?: string | null; phone?: string | null; email?: string | null };
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, data, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.branch.findUnique({ where: { id } });
  if (!existing) throw new Error("Branch not found");

  const updated = await db.branch.update({ where: { id }, data });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "BRANCH_UPDATE",
    module: "company",
    resource: "branch",
    recordId: id,
    oldValue: { name: existing.name },
    newValue: data,
    description: `Updated branch: ${existing.name}`,
    ipAddress,
    userAgent,
    companyId: existing.companyId,
  });

  return updated;
}

export async function setBranchStatus(params: {
  id: string;
  isActive: boolean;
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, isActive, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.branch.findUnique({ where: { id } });
  if (!existing) throw new Error("Branch not found");
  if (existing.isMain && !isActive) throw new Error("Cannot deactivate the main branch");

  await db.branch.update({ where: { id }, data: { isActive } });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: isActive ? "BRANCH_ACTIVATE" : "BRANCH_DEACTIVATE",
    module: "company",
    resource: "branch",
    recordId: id,
    description: `${isActive ? "Activated" : "Deactivated"} branch: ${existing.name}`,
    ipAddress,
    userAgent,
    companyId: existing.companyId,
  });
}
