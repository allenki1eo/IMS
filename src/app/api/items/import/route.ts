import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success as ok, badRequest } from "@/lib/response";
import { createItem } from "@/modules/warehouse/items.service";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:item:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const rows: Record<string, string>[] = body.rows ?? [];

  if (!Array.isArray(rows)) return badRequest("rows must be an array");

  const { ipAddress, userAgent } = getRequestMeta(request);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const name = row["name"]?.trim();
    const sku = row["sku"]?.trim();

    if (!name) {
      errors.push(`Row ${rowNum}: name is required`);
      skipped++;
      continue;
    }
    if (!sku) {
      errors.push(`Row ${rowNum}: sku is required`);
      skipped++;
      continue;
    }

    const reorderPointStr = row["reorderPoint"]?.trim();
    const reorderPoint = reorderPointStr ? parseFloat(reorderPointStr) : null;

    const safetyStockStr = row["safetyStock"]?.trim();
    const safetyStock = safetyStockStr ? parseFloat(safetyStockStr) : null;

    const uomId = row["uomId"]?.trim();
    if (!uomId) {
      errors.push(`Row ${rowNum}: uomId is required`);
      skipped++;
      continue;
    }

    try {
      await createItem({
        companyId,
        code: sku,
        name,
        description: row["description"]?.trim() || null,
        categoryId: row["categoryId"]?.trim() || null,
        uomId,
        itemType: "RAW_MATERIAL",
        minStock: safetyStock && !isNaN(safetyStock) ? safetyStock : 0,
        maxStock: null,
        reorderPoint: reorderPoint && !isNaN(reorderPoint) ? reorderPoint : null,
        createdById: auth.user.id,
        userName: auth.user.fullName,
        ipAddress,
        userAgent,
      });
      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.toLowerCase().includes("unique")) {
        errors.push(`Row ${rowNum}: SKU "${sku}" already exists`);
      } else {
        errors.push(`Row ${rowNum}: ${msg}`);
      }
      skipped++;
    }
  }

  return ok({ imported, skipped, errors });
}
