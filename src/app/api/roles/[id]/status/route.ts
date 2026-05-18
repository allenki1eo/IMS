import { NextRequest } from "next/server";
import { setRoleStatus } from "@/modules/roles/roles.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError, handleError } from "@/lib/response";
import { z } from "zod";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "roles:role:deactivate");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  const { ipAddress, userAgent } = getRequestMeta(request);
  try {
    await setRoleStatus({ id, isActive: parsed.data.isActive, updatedById: auth.user.id, userName: auth.user.fullName, ipAddress, userAgent });
    return success({ message: `Role ${parsed.data.isActive ? "activated" : "deactivated"}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Role not found") return notFound(msg);
    return badRequest(msg);
  }
}
