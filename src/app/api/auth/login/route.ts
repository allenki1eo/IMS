import { NextRequest } from "next/server";
import { loginService } from "@/modules/auth/auth.service";
import { loginSchema } from "@/modules/auth/auth.validation";
import { success, badRequest, handleError } from "@/lib/response";
import { cookies } from "next/headers";

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
    cookieStore.set("erp_session", result.token, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.FORCE_HTTPS === "true",
      sameSite: "lax",
      expires: result.expiresAt,
      path: "/",
    });

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
