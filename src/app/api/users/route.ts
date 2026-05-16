import { NextRequest } from "next/server";
import { listUsers, createUser } from "@/modules/users/users.service";
import { createUserSchema } from "@/modules/users/users.validation";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, created, paginated, badRequest, conflict, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "users:user:read");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const params = parsePagination(searchParams);
  try {
    const { users, total } = await listUsers({
      ...params,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
    });

    return paginated(users, buildMeta(total, params));
  } catch (err) {
    console.error("[API Error]", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "users:user:create");
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const user = await createUser({
      ...parsed.data,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(user);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("Unique constraint") || msg.includes("unique")) {
      return conflict("Username or email already exists");
    }
    return serverError();
  }
}
