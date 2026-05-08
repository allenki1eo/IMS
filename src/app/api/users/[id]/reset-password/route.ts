import { NextRequest } from "next/server";
import { resetUserPassword } from "@/modules/users/users.service";
import { resetPasswordSchema } from "@/modules/users/users.validation";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, serverError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "users:user:reset_password");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    await resetUserPassword({
      id,
      newPassword: parsed.data.newPassword,
      resetById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success({ message: "Password reset. User must change on next login." });
  } catch (err) {
    return serverError();
  }
}
