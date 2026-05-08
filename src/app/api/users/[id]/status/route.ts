import { NextRequest } from "next/server";
import { setUserStatus } from "@/modules/users/users.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";
import { z } from "zod";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "users:user:deactivate");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (id === auth.user.id) return badRequest("You cannot change your own account status");

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    await setUserStatus({
      id,
      isActive: parsed.data.isActive,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success({ message: `User ${parsed.data.isActive ? "activated" : "deactivated"}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "User not found") return notFound(msg);
    return badRequest(msg);
  }
}
