import { NextRequest } from "next/server";
import { listDrivers, createDriver } from "@/modules/transport/drivers.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "transport:driver:read");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const isAvailableParam = searchParams.get("isAvailable");
  const isAvailable =
    isAvailableParam === "true" ? true : isAvailableParam === "false" ? false : undefined;

  try {
    const { data, meta } = await listDrivers({
      search,
      status,
      isAvailable,
      page: paginationParams.page,
      pageSize: paginationParams.pageSize,
    });
    return paginated(data, buildMeta(meta.total, paginationParams));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "transport:driver:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const {
    employeeId,
    firstName,
    lastName,
    phone,
    email,
    licenseNumber,
    licenseClass,
    licenseExpiry,
    medicalExpiry,
    notes,
  } = body;

  if (!employeeId && !firstName) {
    return badRequest("Either employeeId or firstName is required");
  }

  const { ipAddress } = getRequestMeta(request);

  try {
    const driver = await createDriver({
      companyId,
      employeeId: employeeId ?? null,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      phone: phone ?? null,
      email: email ?? null,
      licenseNumber: licenseNumber ?? null,
      licenseClass: licenseClass ?? null,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      medicalExpiry: medicalExpiry ? new Date(medicalExpiry) : null,
      notes: notes ?? null,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return created(driver);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (
      msg === "Employee not found" ||
      msg === "Employee is not marked as a driver" ||
      msg === "Driver record already exists for this employee" ||
      msg === "Either employeeId or firstName is required"
    ) {
      return badRequest(msg);
    }
    return handleError(err);
  }
}
