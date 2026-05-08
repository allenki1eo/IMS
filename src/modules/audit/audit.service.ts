import { db } from "@/lib/db";

export async function listAuditLogs(params: {
  page: number;
  pageSize: number;
  module?: string;
  resource?: string;
  userId?: string;
  action?: string;
  recordId?: string;
  from?: Date;
  to?: Date;
}) {
  const { page, pageSize, module, resource, userId, action, recordId, from, to } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(module ? { module } : {}),
    ...(resource ? { resource } : {}),
    ...(userId ? { userId } : {}),
    ...(action ? { action } : {}),
    ...(recordId ? { recordId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    db.auditLog.count({ where }),
  ]);

  return { logs, total };
}
