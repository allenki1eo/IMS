import { NextRequest } from "next/server";
import { getRoleById, updateRole, setRoleStatus } from "@/modules/roles/roles.service";
import { updateRoleSchema } from "@/modules/roles/roles.validation";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "roles:role:read");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const role = await getRoleById(id);
  if (!role) return notFound("Role not found");
  return success(role);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "roles:role:update");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await request.json();
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  const { ipAddress, userAgent } = getRequestMeta(request);
  try {
    const role = await updateRole({ id, data: parsed.data, updatedById: auth.user.id, userName: auth.user.fullName, ipAddress, userAgent });
    return success(role);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Role not found") return notFound(msg);
    return badRequest(msg);
  }
}
