import { NextRequest } from "next/server";
import { revokeSession } from "@/lib/session";
import { createAuditLog, getRequestMeta } from "@/lib/audit";
import { success } from "@/lib/response";
import { cookies } from "next/headers";
import { getUser } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  const jti = request.headers.get("x-user-jti");
  const { ipAddress, userAgent } = getRequestMeta(request);

  if (jti) await revokeSession(jti, "logout");

  if (user) {
    await createAuditLog({
      userId: user.id,
      userName: user.fullName,
      action: "LOGOUT",
      module: "auth",
      resource: "session",
      description: "User logged out",
      ipAddress,
      userAgent,
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete("erp_session");

  return success({ message: "Logged out successfully" });
}
