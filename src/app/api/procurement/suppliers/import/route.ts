import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success as ok, badRequest } from "@/lib/response";
import { createSupplier } from "@/modules/procurement/suppliers.service";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "procurement:supplier:create");
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

    if (!name) {
      errors.push(`Row ${rowNum}: name is required`);
      skipped++;
      continue;
    }

    // Auto-generate code from name if not provided
    const code = row["code"]?.trim() || name.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 10);

    try {
      await createSupplier(
        companyId,
        {
          code,
          name,
          contactPerson: row["contactPerson"]?.trim() || null,
          email: row["email"]?.trim() || null,
          phone: row["phone"]?.trim() || null,
          address: row["address"]?.trim() || null,
          taxNumber: row["taxNumber"]?.trim() || null,
          paymentTerms: null,
        },
        auth.user.id,
        auth.user.fullName,
        ipAddress
      );
      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.toLowerCase().includes("unique")) {
        errors.push(`Row ${rowNum}: Supplier code "${code}" already exists`);
      } else {
        errors.push(`Row ${rowNum}: ${msg}`);
      }
      skipped++;
    }
  }

  return ok({ imported, skipped, errors });
}
