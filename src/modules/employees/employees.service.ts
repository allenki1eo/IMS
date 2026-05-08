import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listEmployees(params: {
  companyId: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  branchId?: string;
  departmentId?: string;
  isDriver?: boolean;
}) {
  const { companyId, page, pageSize, search, status, branchId, departmentId, isDriver } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(search
      ? {
          OR: [
            { fullName: { contains: search } },
            { employeeNumber: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(branchId ? { branchId } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(isDriver !== undefined ? { isDriver } : {}),
  };

  const [employees, total] = await Promise.all([
    db.employee.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { fullName: "asc" },
      include: {
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        users: { select: { id: true, username: true } },
      },
    }),
    db.employee.count({ where }),
  ]);

  return { employees, total };
}

export async function getEmployeeById(id: string) {
  return db.employee.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      users: { select: { id: true, username: true, email: true, isActive: true } },
    },
  });
}

export async function createEmployee(params: {
  companyId: string;
  branchId?: string | null;
  departmentId?: string | null;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  employmentType?: string;
  hireDate?: Date | string | null;
  isDriver?: boolean;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { createdById, userName, ipAddress, userAgent, firstName, lastName, ...data } = params;

  const fullName = `${firstName} ${lastName}`.trim();

  const employee = await db.employee.create({
    data: { ...data, firstName, lastName, fullName, createdById },
    select: { id: true, employeeNumber: true, fullName: true, createdAt: true },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "EMP_CREATE",
    module: "employees",
    resource: "employee",
    recordId: employee.id,
    newValue: { employeeNumber: data.employeeNumber, fullName },
    description: `Created employee: ${fullName}`,
    ipAddress,
    userAgent,
    companyId: data.companyId,
  });

  return employee;
}

export async function updateEmployee(params: {
  id: string;
  data: {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
    position?: string | null;
    branchId?: string | null;
    departmentId?: string | null;
    employmentType?: string;
    hireDate?: Date | string | null;
    isDriver?: boolean;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, data, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.employee.findUnique({ where: { id } });
  if (!existing) throw new Error("Employee not found");

  const updateData = {
    ...data,
    ...(data.firstName || data.lastName
      ? {
          fullName: `${data.firstName ?? existing.firstName} ${data.lastName ?? existing.lastName}`.trim(),
        }
      : {}),
  };

  const updated = await db.employee.update({ where: { id }, data: updateData });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "EMP_UPDATE",
    module: "employees",
    resource: "employee",
    recordId: id,
    oldValue: { fullName: existing.fullName, position: existing.position ?? undefined },
    newValue: data,
    description: `Updated employee: ${existing.fullName}`,
    ipAddress,
    userAgent,
    companyId: existing.companyId,
  });

  return updated;
}

export async function setEmployeeStatus(params: {
  id: string;
  status: string;
  terminationDate?: Date;
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, status, terminationDate, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.employee.findUnique({ where: { id } });
  if (!existing) throw new Error("Employee not found");

  await db.employee.update({
    where: { id },
    data: {
      status,
      isActive: status === "ACTIVE",
      ...(terminationDate ? { terminationDate } : {}),
    },
  });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "EMP_STATUS_CHANGE",
    module: "employees",
    resource: "employee",
    recordId: id,
    oldValue: { status: existing.status },
    newValue: { status },
    description: `Changed employee status to ${status}: ${existing.fullName}`,
    ipAddress,
    userAgent,
    companyId: existing.companyId,
  });
}
