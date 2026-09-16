import { NextRequest } from "next/server";
import { loginService } from "@/modules/auth/auth.service";
import { loginSchema } from "@/modules/auth/auth.validation";
import { success, badRequest, handleError } from "@/lib/response";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  COMPANY_COOKIE,
  companyCookieOptions,
  resolveBootstrapCompanyId,
} from "@/lib/company-cookie";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors[0].message);
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    const userAgent = request.headers.get("user-agent") ?? "unknown";

    const result = await loginService({
      ...parsed.data,
      ipAddress,
      userAgent,
    });

    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.FORCE_HTTPS === "true",
      sameSite: "lax" as const,
      path: "/",
    };

    cookieStore.set("erp_session", result.token, {
      ...cookieOptions,
      expires: result.expiresAt,
    });

    // Always set erp_company_id on login so getCompanyId() never depends on
    // a leftover cookie or unordered findFirst(). Prefer the user's assigned
    // company; otherwise pick a deterministic bootstrap company.
    let companyId: string | null = null;
    try {
      const loggedInUser = await db.user.findUnique({
        where: { id: result.userId },
        select: { companyId: true },
      });
      companyId = await resolveBootstrapCompanyId(loggedInUser?.companyId ?? null);
    } catch {
      // companyId column not yet migrated — still bootstrap from companies table
      companyId = await resolveBootstrapCompanyId(null);
    }

    if (companyId) {
      cookieStore.set(COMPANY_COOKIE, companyId, companyCookieOptions());
    } else {
      cookieStore.delete(COMPANY_COOKIE);
    }

    return success({
      userId: result.userId,
      mustChangePassword: result.mustChangePassword,
      companyId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    if (message === "Invalid credentials" || message.includes("deactivated")) {
      return badRequest(message, "AUTH_ERROR");
    }
    console.error("[auth/login] Unexpected login error", err);
    return handleError(err);
  }
}
