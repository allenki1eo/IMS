import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "./session";
import { validateSession } from "./session";
import { hasPermission } from "./permissions";
import { unauthorized, forbidden, serverError, badRequest } from "./response";
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

function canSwitchCompany(authUser: AuthUser): boolean {
  return (
    authUser.isSystemUser ||
    authUser.permissions.includes("*") ||
    authUser.permissions.includes("company:company:switch")
  );
}

async function resolveExistingCompanyId(companyId: string | null | undefined): Promise<string | null> {
  if (!companyId) return null;
  try {
    const { db } = await import("./db");
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    return company?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve the active company for this request.
 *
 * Priority:
 * 1. Users with switch permission: validated `erp_company_id` cookie (via x-company-id)
 * 2. User's assigned companyId
 * 3. Validated cookie when there is no authenticated user context
 *
 * Never falls back to unordered `findFirst()` — that silently scoped lists to
 * the wrong company when the cookie was unset. Callers should treat null as
 * "Company not configured" and login/company GET heal the cookie instead.
 */
export async function getCompanyId(request?: NextRequest): Promise<string | null> {
  try {
    if (request) {
      const userId = request.headers.get("x-user-id");

      if (userId) {
        const authUser = await getAuthUser(userId);

        if (authUser) {
          if (canSwitchCompany(authUser)) {
            const cookieCompanyId = request.headers.get("x-company-id");
            // Ignore stale/bogus erp_company_id cookies so scoped module lists
            // do not silently go empty after a company delete or corrupt cookie.
            const validCookieCompanyId = await resolveExistingCompanyId(cookieCompanyId);
            if (validCookieCompanyId) return validCookieCompanyId;
          }

          // Enforce user's assigned company (non-switchers always; switchers
          // when cookie is missing/invalid).
          if (authUser.companyId) {
            return (await resolveExistingCompanyId(authUser.companyId)) ?? authUser.companyId;
          }

          return null;
        }
      }

      // Fall back to cookie header (no authenticated user context)
      const cookieCompanyId = request.headers.get("x-company-id");
      return await resolveExistingCompanyId(cookieCompanyId);
    }

    // No request: do not guess a company — callers must pass request or heal.
    return null;
  } catch {
    return null;
  }
}

/**
 * Safely parse JSON from a request body.
 * Returns { body, error } — if error is set, return it immediately.
 */
export async function parseBody<T = Record<string, unknown>>(
  request: NextRequest
): Promise<{ body: T; error: null } | { body: null; error: NextResponse }> {
  try {
    const body = await request.json() as T;
    return { body, error: null };
  } catch {
    return { body: null, error: badRequest("Invalid or missing JSON body") };
  }
}

/**
 * Wraps a route handler so any unhandled exception returns a 500 JSON response
 * instead of crashing the route with an HTML error page.
 */
export function withErrorHandling(
  handler: (request: NextRequest, context?: { params: Record<string, string> }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    try {
      return await handler(request, context);
    } catch (err) {
      console.error("[API Error]", err);
      return serverError("An unexpected error occurred");
    }
  };
}
