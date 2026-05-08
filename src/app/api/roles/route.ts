import { NextRequest } from "next/server";
import { listRoles, createRole } from "@/modules/roles/roles.service";
import { createRoleSchema } from "@/modules/roles/roles.validation";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, created, badRequest, conflict, serverError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "roles:role:read");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const roles = await listRoles({
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  return success(roles);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "roles:role:create");
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const role = await createRole({
      ...parsed.data,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(role);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("Unique constraint")) return conflict("Role name or code already exists");
    return serverError();
  }
}
