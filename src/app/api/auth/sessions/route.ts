import { NextRequest } from "next/server";
import { requireAuth, getRequestMeta } from "@/lib/api-helpers";
import { revokeSessionById } from "@/lib/session";
import { db } from "@/lib/db";
import { success, badRequest , serverError} from "@/lib/response";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const sessions = await db.session.findMany({
      where: { userId: auth.user.id, isActive: true, expiresAt: { gt: new Date() } },
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, lastActivityAt: true },
      orderBy: { lastActivityAt: "desc" },
    });

    return success(sessions);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("id");
  if (!sessionId) return badRequest("Session ID required");

  const session = await db.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== auth.user.id) return badRequest("Session not found");

  const { ipAddress, userAgent } = getRequestMeta(request);
  await revokeSessionById(sessionId, "manual_revoke");

  await createAuditLog({
    userId: auth.user.id,
    userName: auth.user.fullName,
    action: "SESSION_REVOKE",
    module: "auth",
    resource: "session",
    recordId: sessionId,
    description: "User revoked a session",
    ipAddress,
    userAgent,
  });

  return success({ message: "Session revoked" });
}
