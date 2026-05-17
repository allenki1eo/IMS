import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success as ok, badRequest } from "@/lib/response";
import { createEmployee } from "@/modules/employees/employees.service";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "employees:employee:create");
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

    const firstName = row["firstName"]?.trim();
    const lastName = row["lastName"]?.trim();
    const employeeNumber = row["employeeNumber"]?.trim();

    if (!firstName) {
      errors.push(`Row ${rowNum}: firstName is required`);
      skipped++;
      continue;
    }
    if (!lastName) {
      errors.push(`Row ${rowNum}: lastName is required`);
      skipped++;
      continue;
    }
    if (!employeeNumber) {
      errors.push(`Row ${rowNum}: employeeNumber is required`);
      skipped++;
      continue;
    }

    const email = row["email"]?.trim() || null;
    const hireDate = row["hireDate"]?.trim();

    try {
      await createEmployee({
        companyId,
        employeeNumber,
        firstName,
        lastName,
        email: email || null,
        phone: row["phone"]?.trim() || null,
        position: row["jobTitle"]?.trim() || null,
        departmentId: row["departmentId"]?.trim() || null,
        branchId: null,
        employmentType: "PERMANENT",
        hireDate: hireDate ? new Date(hireDate).toISOString() : null,
        isDriver: false,
        createdById: auth.user.id,
        userName: auth.user.fullName,
        ipAddress,
        userAgent,
      });
      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("unique") || msg.includes("Unique")) {
        errors.push(`Row ${rowNum}: Employee number "${employeeNumber}" already exists`);
      } else {
        errors.push(`Row ${rowNum}: ${msg}`);
      }
      skipped++;
    }
  }

  return ok({ imported, skipped, errors });
}
