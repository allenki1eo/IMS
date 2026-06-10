import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { createAuditLog } from "@/lib/audit";
import { invalidateAuthUser } from "@/lib/session";

export async function listUsers(params: {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  branchId?: string;
}) {
  const { page, pageSize, search, status, branchId } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(search
      ? {
          OR: [
            { fullName: { contains: search } },
            { username: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        avatarPath: true,
        isActive: true,
        isSystemUser: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        roles: {
          include: { role: { select: { id: true, name: true, code: true } } },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  return { users, total };
}

export async function getUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      phone: true,
      avatarPath: true,
      isActive: true,
      isSystemUser: true,
      mustChangePassword: true,
      lastLoginAt: true,
      passwordChangedAt: true,
      createdAt: true,
      updatedAt: true,
      employeeId: true,
      companyId: true,
      roles: {
        include: {
          role: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      },
      employee: {
        select: { id: true, fullName: true, employeeNumber: true, position: true },
      },
    },
  });
}

export async function createUser(params: {
  username: string;
  email: string;
  fullName: string;
  phone?: string | null;
  password: string;
  employeeId?: string;
  companyId?: string | null;
  mustChangePassword?: boolean;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const {
    username,
    email,
    fullName,
    phone,
    password,
    employeeId,
    companyId,
    mustChangePassword = true,
    createdById,
    userName,
    ipAddress,
    userAgent,
  } = params;

  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      username,
      email,
      fullName,
      phone,
      passwordHash,
      employeeId,
      companyId: companyId ?? null,
      mustChangePassword,
      createdById,
    },
    select: { id: true, username: true, email: true, fullName: true, createdAt: true },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "USER_CREATE",
    module: "users",
    resource: "user",
    recordId: user.id,
    newValue: { username, email, fullName },
    description: `Created user: ${fullName}`,
    ipAddress,
    userAgent,
  });

  return user;
}

export async function updateUser(params: {
  id: string;
  data: { fullName?: string; email?: string; phone?: string | null; employeeId?: string | null; companyId?: string | null };
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, data, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) throw new Error("User not found");

  const updated = await db.user.update({
    where: { id },
    data,
    select: { id: true, username: true, email: true, fullName: true, updatedAt: true },
  });
  invalidateAuthUser(id);

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "USER_UPDATE",
    module: "users",
    resource: "user",
    recordId: id,
    oldValue: { fullName: existing.fullName, email: existing.email, phone: existing.phone ?? undefined },
    newValue: data,
    description: `Updated user: ${existing.fullName}`,
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function setUserStatus(params: {
  id: string;
  isActive: boolean;
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, isActive, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) throw new Error("User not found");
  if (existing.isSystemUser && !isActive) throw new Error("Cannot deactivate system user");

  await db.user.update({ where: { id }, data: { isActive } });
  invalidateAuthUser(id);

  await createAuditLog({
    userId: updatedById,
    userName,
    action: isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE",
    module: "users",
    resource: "user",
    recordId: id,
    description: `${isActive ? "Activated" : "Deactivated"} user: ${existing.fullName}`,
    ipAddress,
    userAgent,
  });
}

export async function resetUserPassword(params: {
  id: string;
  newPassword: string;
  resetById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, newPassword, resetById, userName, ipAddress, userAgent } = params;

  const passwordHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id },
    data: { passwordHash, mustChangePassword: true },
  });
  invalidateAuthUser(id);

  await createAuditLog({
    userId: resetById,
    userName,
    action: "PASSWORD_RESET",
    module: "users",
    resource: "user",
    recordId: id,
    description: "Admin reset user password",
    ipAddress,
    userAgent,
  });
}

export async function assignRole(params: {
  userId: string;
  roleId: string;
  branchId?: string;
  assignedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { userId, roleId, branchId, assignedById, userName, ipAddress, userAgent } = params;

  const userRole = await db.userRole.create({
    data: { userId, roleId, branchId: branchId ?? null, assignedById },
    include: { role: { select: { name: true } } },
  });
  invalidateAuthUser(userId);

  await createAuditLog({
    userId: assignedById,
    userName,
    action: "ROLE_ASSIGN",
    module: "users",
    resource: "user_role",
    recordId: userId,
    newValue: { roleId, roleName: userRole.role.name, branchId },
    description: `Assigned role "${userRole.role.name}" to user`,
    ipAddress,
    userAgent,
  });

  return userRole;
}

export async function removeRole(params: {
  userRoleId: string;
  removedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { userRoleId, removedById, userName, ipAddress, userAgent } = params;

  const userRole = await db.userRole.findUnique({
    where: { id: userRoleId },
    include: { role: { select: { name: true } } },
  });
  if (!userRole) throw new Error("Role assignment not found");

  await db.userRole.delete({ where: { id: userRoleId } });
  invalidateAuthUser(userRole.userId);

  await createAuditLog({
    userId: removedById,
    userName,
    action: "ROLE_REMOVE",
    module: "users",
    resource: "user_role",
    recordId: userRole.userId,
    oldValue: { roleId: userRole.roleId, roleName: userRole.role.name },
    description: `Removed role "${userRole.role.name}" from user`,
    ipAddress,
    userAgent,
  });
}
