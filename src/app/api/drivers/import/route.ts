import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success as ok, badRequest } from "@/lib/response";
import { createDriver } from "@/modules/transport/drivers.service";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "transport:driver:create");
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

    const firstName = row["firstName"]?.trim() || null;

    if (!firstName) {
      errors.push(`Row ${rowNum}: firstName is required`);
      skipped++;
      continue;
    }

    const licenseExpiry = row["licenseExpiry"]?.trim();
    const medicalExpiry = row["medicalExpiry"]?.trim();

    try {
      await createDriver({
        companyId,
        firstName,
        lastName: row["lastName"]?.trim() || null,
        phone: row["phone"]?.trim() || null,
        email: row["email"]?.trim() || null,
        licenseNumber: row["licenseNumber"]?.trim() || null,
        licenseClass: row["licenseClass"]?.trim() || null,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
        medicalExpiry: medicalExpiry ? new Date(medicalExpiry) : null,
        notes: row["notes"]?.trim() || null,
        createdById: auth.user.id,
        userName: auth.user.fullName,
        ipAddress,
      });
      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Row ${rowNum}: ${msg}`);
      skipped++;
    }
  }

  return ok({ imported, skipped, errors });
}
