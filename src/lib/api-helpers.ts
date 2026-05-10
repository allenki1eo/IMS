import { NextRequest } from "next/server";
import { getAuthUser } from "./session";
import { validateSession } from "./session";
import { hasPermission } from "./permissions";
import { unauthorized, forbidden } from "./response";
import type { AuthUser } from "@/types/auth";

export async function getUser(request: NextRequest): Promise<AuthUser | null> {
  const userId = request.headers.get("x-user-id");
  const jti = request.headers.get("x-user-jti");

  if (!userId || !jti) return null;

  try {
    const isValid = await validateSession(jti);
    if (!isValid) return null;

    return getAuthUser(userId);
  } catch {
    return null;
  }
}

export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthUser } | { error: ReturnType<typeof unauthorized> }> {
  const user = await getUser(request);
  if (!user) return { error: unauthorized() };
  return { user };
}

export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<
  | { user: AuthUser }
  | { error: ReturnType<typeof unauthorized> | ReturnType<typeof forbidden> }
> {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const { user } = auth;
  if (user.mustChangePassword) {
    return { error: forbidden("Please change your password before continuing") };
  }
  if (!hasPermission(user, permission)) {
    return { error: forbidden() };
  }

  return { user };
}

export function getRequestMeta(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return { ipAddress, userAgent };
}

export async function getCompanyId(): Promise<string | null> {
  const { db } = await import("./db");
  const company = await db.company.findFirst({ select: { id: true } });
  return company?.id ?? null;
}
