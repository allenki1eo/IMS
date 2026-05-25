import { NextRequest } from "next/server";
import { changePasswordService } from "@/modules/auth/auth.service";
import { changePasswordRequestSchema } from "@/modules/auth/auth.validation";
import { requireAuth, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = changePasswordRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    await changePasswordService({
      userId: auth.user.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });

    return success({ message: "Password changed successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const knownErrors = [
      "Current password is incorrect",
      "New password must be different from your current password",
      "Password must be at least",
      "User not found",
    ];

    if (knownErrors.some((error) => message.startsWith(error))) {
      return badRequest(message);
    }

    console.error("[change-password]", err);
    return handleError(err);
  }
}
