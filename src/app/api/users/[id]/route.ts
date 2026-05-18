import { NextRequest } from "next/server";
import { getUserById, updateUser } from "@/modules/users/users.service";
import { updateUserSchema } from "@/modules/users/users.validation";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "users:user:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return notFound("User not found");
  return success({
    ...user,
    status: user.isActive ? "ACTIVE" : "INACTIVE",
    roles: user.roles.map((r: any) => ({ id: r.role.id, name: r.role.name, code: r.role.code })),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "users:user:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const updated = await updateUser({
      id,
      data: parsed.data,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "User not found") return notFound(msg);
    return handleError(err);
  }
}
