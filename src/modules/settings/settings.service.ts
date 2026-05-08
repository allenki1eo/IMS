import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function getSettings(params: {
  companyId: string;
  category?: string;
  publicOnly?: boolean;
}) {
  const { companyId, category, publicOnly } = params;
  return db.setting.findMany({
    where: {
      companyId,
      ...(category ? { category } : {}),
      ...(publicOnly ? { isPublic: true } : {}),
    },
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
}

export async function getSetting(key: string): Promise<string | null> {
  const s = await db.setting.findUnique({ where: { key } });
  return s?.value ?? null;
}

export async function updateSetting(params: {
  key: string;
  value: string;
  companyId: string;
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { key, value, companyId, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.setting.findUnique({ where: { key } });
  const oldValue = existing?.value;

  const updated = await db.setting.upsert({
    where: { key },
    update: { value, updatedById },
    create: { key, value, companyId, category: "general", updatedById },
  });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "SETTING_UPDATE",
    module: "settings",
    resource: "setting",
    recordId: key,
    oldValue: { key, value: oldValue },
    newValue: { key, value },
    description: `Updated setting: ${key}`,
    ipAddress,
    userAgent,
    companyId,
  });

  return updated;
}

export async function bulkUpdateSettings(params: {
  settings: Array<{ key: string; value: string }>;
  companyId: string;
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { settings, companyId, updatedById, userName, ipAddress, userAgent } = params;

  const results = await Promise.all(
    settings.map((s) =>
      updateSetting({ ...s, companyId, updatedById, userName, ipAddress, userAgent })
    )
  );

  return results;
}
