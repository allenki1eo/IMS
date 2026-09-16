import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const COMPANY_COOKIE = "erp_company_id";

/** Shared cookie options for erp_company_id (HttpOnly, 1 year). */
export function companyCookieOptions() {
  return {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" ||
      process.env.FORCE_HTTPS === "true",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

/**
 * Deterministic bootstrap company when a user has no assigned companyId
 * (e.g. system/super-admin). Prefer oldest by createdAt so login is stable
 * across restarts — never rely on unordered findFirst().
 */
export async function resolveBootstrapCompanyId(
  preferredCompanyId?: string | null
): Promise<string | null> {
  if (preferredCompanyId) {
    const existing = await db.company.findUnique({
      where: { id: preferredCompanyId },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  const company = await db.company.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return company?.id ?? null;
}

export async function setCompanyCookie(companyId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COMPANY_COOKIE, companyId, companyCookieOptions());
}

export async function clearCompanyCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COMPANY_COOKIE);
}
