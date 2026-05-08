import { db } from "./db";

const REDACTED_FIELDS = new Set([
  "passwordHash",
  "password",
  "token",
  "tokenHash",
  "secret",
  "refreshToken",
]);

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      REDACTED_FIELDS.has(k) ? "[REDACTED]" : v,
    ])
  );
}

export interface AuditLogParams {
  userId?: string | null;
  userName: string;
  action: string;
  module: string;
  resource: string;
  recordId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  companyId?: string;
  branchId?: string;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? null,
        userName: params.userName,
        action: params.action,
        module: params.module,
        resource: params.resource,
        recordId: params.recordId,
        oldValue: params.oldValue ? JSON.stringify(redact(params.oldValue)) : null,
        newValue: params.newValue ? JSON.stringify(redact(params.newValue)) : null,
        description: params.description,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        sessionId: params.sessionId,
        companyId: params.companyId,
        branchId: params.branchId,
      },
    });
  } catch {
    // Audit log failures must never crash the main operation
  }
}

export function getRequestMeta(request: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return { ipAddress, userAgent };
}
