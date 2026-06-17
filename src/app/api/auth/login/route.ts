import { NextRequest } from "next/server";
import { loginService } from "@/modules/auth/auth.service";
import { loginSchema } from "@/modules/auth/auth.validation";
import { success, badRequest, handleError } from "@/lib/response";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

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

    // Resolve the company for this user: prefer user's assigned companyId,
    // fall back to the first company in the database.
    // Wrapped in try/catch in case the companyId column hasn't been migrated yet.
    let companyId: string | null = null;
    try {
      const loggedInUser = await db.user.findUnique({
        where: { id: result.userId },
        select: { companyId: true },
      });
      companyId = loggedInUser?.companyId ?? null;
    } catch {
      // column not yet migrated — fall through to findFirst below
    }
    if (!companyId) {
      companyId = (await db.company.findFirst({ select: { id: true } }))?.id ?? null;
    }
    if (companyId) {
      cookieStore.set("erp_company_id", companyId, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return success({
      userId: result.userId,
      mustChangePassword: result.mustChangePassword,
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
