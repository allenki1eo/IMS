import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success as ok, badRequest } from "@/lib/response";
import { createPart } from "@/modules/maintenance/parts.service";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "maintenance:spare_part:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const rows: Record<string, string>[] = body.rows ?? [];

  if (!Array.isArray(rows)) return badRequest("rows must be an array");

  const { ipAddress } = getRequestMeta(request);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const name = row["name"]?.trim();
    const partNumber = row["partNumber"]?.trim();

    if (!name) {
      errors.push(`Row ${rowNum}: name is required`);
      skipped++;
      continue;
    }

    // Generate a code from partNumber or name if not explicitly provided
    const code = row["code"]?.trim() || (partNumber ?? name.replace(/\s+/g, "-").toUpperCase().slice(0, 20));

    const reorderPointStr = row["reorderPoint"]?.trim();
    const reorderPoint = reorderPointStr ? parseFloat(reorderPointStr) : 0;

    const unitCostStr = row["unitCost"]?.trim();
    const unitCost = unitCostStr ? parseFloat(unitCostStr) : null;

    try {
      await createPart(
        companyId,
        {
          categoryId: row["categoryId"]?.trim() || null,
          code,
          name,
          description: row["description"]?.trim() || null,
          partNumber: partNumber || null,
          uom: row["uomId"]?.trim() || "PCS",
          currentStock: 0,
          minStock: !isNaN(reorderPoint) ? reorderPoint : 0,
          unitCost: unitCost && !isNaN(unitCost) ? unitCost : null,
        },
        auth.user.id,
        auth.user.fullName,
        ipAddress
      );
      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.toLowerCase().includes("unique")) {
        errors.push(`Row ${rowNum}: Part code "${code}" already exists`);
      } else {
        errors.push(`Row ${rowNum}: ${msg}`);
      }
      skipped++;
    }
  }

  return ok({ imported, skipped, errors });
}
