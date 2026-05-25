import { NextRequest } from "next/server";
import { assignRole, removeRole } from "@/modules/users/users.service";
import { assignRoleSchema } from "@/modules/users/users.validation";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { success, created, badRequest, notFound, handleError } from "@/lib/response";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "users:user:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const roles = await db.userRole.findMany({
    where: { userId: id },
    include: {
      role: { select: { id: true, name: true, code: true } },
      branch: { select: { id: true, name: true } },
    },
  });
  return success(roles);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "users:user:assign_role");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = assignRoleSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const result = await assignRole({
      userId: id,
      roleId: parsed.data.roleId,
      branchId: parsed.data.branchId,
      assignedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("Unique constraint")) return badRequest("Role already assigned");
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "users:user:assign_role");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const userRoleId = searchParams.get("userRoleId");
  if (!userRoleId) return badRequest("userRoleId query param required");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    await removeRole({
      userRoleId,
      removedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success({ message: "Role removed" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("not found")) return notFound(msg);
    return handleError(err);
  }
}
