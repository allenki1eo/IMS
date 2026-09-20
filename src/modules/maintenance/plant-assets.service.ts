import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export const PLANT_ASSET_CATEGORIES = [
  "STILL",
  "TANK",
  "FILLER",
  "BOILER",
  "OTHER",
] as const;

export type PlantAssetCategory = (typeof PLANT_ASSET_CATEGORIES)[number];

export function isPlantAssetCategory(value: string): value is PlantAssetCategory {
  return (PLANT_ASSET_CATEGORIES as readonly string[]).includes(value);
}

export async function listPlantAssets(
  companyId: string,
  params: {
    search?: string;
    category?: string;
    status?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, category, status, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(category ? { category } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search } },
            { name: { contains: search } },
            { location: { contains: search } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    db.plantAsset.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ category: "asc" }, { code: "asc" }],
    }),
    db.plantAsset.count({ where }),
  ]);

  return { data, meta: { total, page, pageSize } };
}

export async function getPlantAsset(companyId: string, id: string) {
  const asset = await db.plantAsset.findUnique({ where: { id } });
  if (!asset || asset.companyId !== companyId) return null;
  return asset;
}

export async function createPlantAsset(
  companyId: string,
  data: {
    code: string;
    name: string;
    category: string;
    location?: string | null;
    notes?: string | null;
    status?: string;
    branchId?: string | null;
  },
  createdById: string,
  userName: string,
  ipAddress?: string
) {
  if (!data.code.trim()) throw new Error("code is required");
  if (!data.name.trim()) throw new Error("name is required");
  if (!isPlantAssetCategory(data.category)) {
    throw new Error("category must be one of STILL, TANK, FILLER, BOILER, OTHER");
  }

  const code = data.code.trim();
  const existing = await db.plantAsset.findUnique({
    where: { companyId_code: { companyId, code } },
  });
  if (existing) throw new Error("Plant asset code already exists");

  const asset = await db.plantAsset.create({
    data: {
      companyId,
      branchId: data.branchId ?? null,
      code,
      name: data.name.trim(),
      category: data.category,
      location: data.location ?? null,
      notes: data.notes ?? null,
      status: data.status ?? "ACTIVE",
      createdById,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "PLANT_ASSET_CREATE",
    module: "maintenance",
    resource: "plant_asset",
    recordId: asset.id,
    newValue: { code: asset.code, name: asset.name, category: asset.category },
    description: `Created plant asset: ${asset.code} — ${asset.name}`,
    ipAddress,
    companyId,
  });

  return asset;
}

export async function updatePlantAsset(
  companyId: string,
  id: string,
  data: {
    name?: string;
    category?: string;
    location?: string | null;
    notes?: string | null;
    status?: string;
    isActive?: boolean;
  },
  updatedById: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.plantAsset.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId) {
    throw new Error("Plant asset not found");
  }
  if (data.category !== undefined && !isPlantAssetCategory(data.category)) {
    throw new Error("category must be one of STILL, TANK, FILLER, BOILER, OTHER");
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.category !== undefined) updateData.category = data.category;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await db.plantAsset.update({ where: { id }, data: updateData });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "PLANT_ASSET_UPDATE",
    module: "maintenance",
    resource: "plant_asset",
    recordId: id,
    oldValue: { name: existing.name, category: existing.category, status: existing.status },
    newValue: updateData,
    description: `Updated plant asset: ${existing.code}`,
    ipAddress,
    companyId,
  });

  return updated;
}
