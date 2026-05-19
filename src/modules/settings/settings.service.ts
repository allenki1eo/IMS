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

export async function createSetting(params: {
  key: string;
  value: string;
  category: string;
  description?: string;
  isPublic?: boolean;
  companyId: string;
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const {
    key,
    value,
    category,
    description,
    isPublic,
    companyId,
    updatedById,
    userName,
    ipAddress,
    userAgent,
  } = params;

  const existing = await db.setting.findUnique({ where: { key } });
  if (existing) {
    throw new Error(`Setting with key "${key}" already exists`);
  }

  const created = await db.setting.create({
    data: {
      key,
      value,
      category,
      description: description ?? null,
      isPublic: isPublic ?? false,
      companyId,
      updatedById,
    },
  });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "SETTING_CREATE",
    module: "settings",
    resource: "setting",
    recordId: key,
    newValue: { key, value, category, description, isPublic },
    description: `Created setting: ${key}`,
    ipAddress,
    userAgent,
    companyId,
  });

  return created;
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

export async function deleteSetting(params: {
  key: string;
  companyId: string;
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { key, companyId, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.setting.findUnique({ where: { key } });
  if (!existing) {
    throw new Error(`Setting with key "${key}" not found`);
  }

  await db.setting.delete({ where: { key } });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "SETTING_DELETE",
    module: "settings",
    resource: "setting",
    recordId: key,
    oldValue: { key, value: existing.value, category: existing.category },
    description: `Deleted setting: ${key}`,
    ipAddress,
    userAgent,
    companyId,
  });
}
