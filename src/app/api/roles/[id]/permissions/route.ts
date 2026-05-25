import { NextRequest } from "next/server";
import { getRoleById, updateRolePermissions } from "@/modules/roles/roles.service";
import { updatePermissionsSchema } from "@/modules/roles/roles.validation";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "roles:role:read");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const role = await getRoleById(id);
  if (!role) return notFound("Role not found");
  return success(role.permissions.map((rp) => rp.permission));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "roles:permission:assign");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await request.json();
  const parsed = updatePermissionsSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  const { ipAddress, userAgent } = getRequestMeta(request);
  try {
    await updateRolePermissions({ roleId: id, permissionIds: parsed.data.permissionIds, updatedById: auth.user.id, userName: auth.user.fullName, ipAddress, userAgent });
    return success({ message: "Permissions updated" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Role not found") return notFound(msg);
    return handleError(err);
  }
}
