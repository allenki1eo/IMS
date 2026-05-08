import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listDepartments(params: {
  companyId: string;
  branchId?: string | null;
  parentId?: string | null;
  search?: string;
  status?: string;
}) {
  const { companyId, branchId, search, status, parentId } = params;
  return db.department.findMany({
    where: {
      companyId,
      ...(branchId ? { branchId } : {}),
      ...(parentId !== undefined ? { parentId: parentId ?? null } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : {}),
      ...(status === "active" ? { isActive: true } : {}),
      ...(status === "inactive" ? { isActive: false } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      branch: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true } },
      _count: { select: { children: true, employees: true } },
    },
  });
}

export async function getDepartmentById(id: string) {
  return db.department.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true } },
      children: { where: { isActive: true }, orderBy: { name: "asc" } },
    },
  });
}

export async function createDepartment(params: {
  companyId: string;
  branchId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  parentId?: string | null;
  headEmployeeId?: string | null;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { createdById, userName, ipAddress, userAgent, ...data } = params;

  const dept = await db.department.create({
    data: { ...data, createdById },
    select: { id: true, name: true, code: true, createdAt: true },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "DEPT_CREATE",
    module: "company",
    resource: "department",
    recordId: dept.id,
    newValue: { name: data.name, code: data.code },
    description: `Created department: ${data.name}`,
    ipAddress,
    userAgent,
    companyId: data.companyId,
  });

  return dept;
}

export async function updateDepartment(params: {
  id: string;
  data: {
    name?: string;
    description?: string | null;
    branchId?: string | null;
    parentId?: string | null;
    headEmployeeId?: string | null;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, data, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.department.findUnique({ where: { id } });
  if (!existing) throw new Error("Department not found");

  const updated = await db.department.update({ where: { id }, data });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "DEPT_UPDATE",
    module: "company",
    resource: "department",
    recordId: id,
    oldValue: { name: existing.name },
    newValue: data,
    description: `Updated department: ${existing.name}`,
    ipAddress,
    userAgent,
    companyId: existing.companyId,
  });

  return updated;
}

export async function setDepartmentStatus(params: {
  id: string;
  isActive: boolean;
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, isActive, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.department.findUnique({ where: { id } });
  if (!existing) throw new Error("Department not found");

  await db.department.update({ where: { id }, data: { isActive } });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: isActive ? "DEPT_ACTIVATE" : "DEPT_DEACTIVATE",
    module: "company",
    resource: "department",
    recordId: id,
    description: `${isActive ? "Activated" : "Deactivated"} department: ${existing.name}`,
    ipAddress,
    userAgent,
    companyId: existing.companyId,
  });
}
