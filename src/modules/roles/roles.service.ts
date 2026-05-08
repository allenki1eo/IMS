import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listRoles(params: { search?: string; status?: string }) {
  const { search, status } = params;
  const where = {
    ...(search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : {}),
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
  };

  return db.role.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { permissions: true, userRoles: true } },
    },
  });
}

export async function getRoleById(id: string) {
  return db.role.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { userRoles: true } },
    },
  });
}

export async function createRole(params: {
  name: string;
  code: string;
  description?: string | null;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { name, code, description, createdById, userName, ipAddress, userAgent } = params;

  const role = await db.role.create({
    data: { name, code: code.toUpperCase(), description, createdById },
    select: { id: true, name: true, code: true, createdAt: true },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "ROLE_CREATE",
    module: "roles",
    resource: "role",
    recordId: role.id,
    newValue: { name, code },
    description: `Created role: ${name}`,
    ipAddress,
    userAgent,
  });

  return role;
}

export async function updateRole(params: {
  id: string;
  data: { name?: string; description?: string | null };
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, data, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.role.findUnique({ where: { id } });
  if (!existing) throw new Error("Role not found");
  if (existing.isSystemRole && data.name && data.name !== existing.name) {
    throw new Error("Cannot rename a system role");
  }

  const updated = await db.role.update({ where: { id }, data });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "ROLE_UPDATE",
    module: "roles",
    resource: "role",
    recordId: id,
    oldValue: { name: existing.name, description: existing.description ?? undefined },
    newValue: data,
    description: `Updated role: ${existing.name}`,
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function setRoleStatus(params: {
  id: string;
  isActive: boolean;
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, isActive, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.role.findUnique({ where: { id } });
  if (!existing) throw new Error("Role not found");
  if (existing.isSystemRole && !isActive) throw new Error("Cannot deactivate a system role");

  await db.role.update({ where: { id }, data: { isActive } });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: isActive ? "ROLE_ACTIVATE" : "ROLE_DEACTIVATE",
    module: "roles",
    resource: "role",
    recordId: id,
    description: `${isActive ? "Activated" : "Deactivated"} role: ${existing.name}`,
    ipAddress,
    userAgent,
  });
}

export async function updateRolePermissions(params: {
  roleId: string;
  permissionIds: string[];
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { roleId, permissionIds, updatedById, userName, ipAddress, userAgent } = params;

  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Role not found");

  // Replace all permissions
  await db.rolePermission.deleteMany({ where: { roleId } });

  if (permissionIds.length > 0) {
    await db.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
        grantedById: updatedById,
      })),
    });
  }

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "PERMISSION_ASSIGN",
    module: "roles",
    resource: "role_permission",
    recordId: roleId,
    newValue: { permissionIds, count: permissionIds.length },
    description: `Updated permissions for role: ${role.name} (${permissionIds.length} permissions)`,
    ipAddress,
    userAgent,
  });
}

export async function listAllPermissions() {
  return db.permission.findMany({ orderBy: [{ module: "asc" }, { resource: "asc" }, { action: "asc" }] });
}
