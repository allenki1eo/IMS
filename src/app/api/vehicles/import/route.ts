import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success as ok, badRequest, handleError } from "@/lib/response";
import { createVehicle } from "@/modules/transport/vehicles.service";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "transport:vehicle:create");
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
    const rowNum = i + 2; // 1-indexed, offset for header

    const plateNumber = row["plateNumber"]?.trim();
    const make = row["make"]?.trim();
    const model = row["model"]?.trim();

    if (!plateNumber) {
      skipped++;
      continue;
    }
    if (!make) {
      errors.push(`Row ${rowNum}: make is required`);
      skipped++;
      continue;
    }
    if (!model) {
      errors.push(`Row ${rowNum}: model is required`);
      skipped++;
      continue;
    }

    const yearStr = row["year"]?.trim();
    const year = yearStr ? parseInt(yearStr, 10) : null;

    const capacityStr = row["capacity"]?.trim();
    const capacity = capacityStr ? parseFloat(capacityStr) : null;

    try {
      await createVehicle({
        companyId,
        branchId: null,
        plateNumber,
        make,
        model,
        year: year !== null && !isNaN(year) ? year : null,
        vehicleType: row["vehicleType"]?.trim() || "TRUCK",
        capacity: capacity !== null && !isNaN(capacity) ? capacity : null,
        fuelType: row["fuelType"]?.trim() || "DIESEL",
        color: row["color"]?.trim() || null,
        chassisNumber: row["chassisNumber"]?.trim() || null,
        engineNumber: row["engineNumber"]?.trim() || null,
        odometer: 0,
        insuranceExpiry: null,
        roadWorthyExpiry: null,
        notes: null,
        createdById: auth.user.id,
        userName: auth.user.fullName,
        ipAddress,
      });
      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("plate")) {
        errors.push(`Row ${rowNum}: Plate number "${plateNumber}" already exists`);
      } else {
        errors.push(`Row ${rowNum}: ${msg}`);
      }
      skipped++;
    }
  }

  return ok({ imported, skipped, errors });
}
