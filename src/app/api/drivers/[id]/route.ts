import { NextRequest } from "next/server";
import { getDriverById, updateDriver } from "@/modules/transport/drivers.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:driver:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const driver = await getDriverById(id);
  if (!driver) return notFound("Driver not found");
  if (driver.companyId !== companyId) return notFound("Driver not found");

  return success(driver);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:driver:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { licenseNumber, licenseClass, licenseExpiry, medicalExpiry, status, notes } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateDriver({
      id,
      data: {
        ...(licenseNumber !== undefined ? { licenseNumber } : {}),
        ...(licenseClass !== undefined ? { licenseClass } : {}),
        ...(licenseExpiry !== undefined
          ? { licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null }
          : {}),
        ...(medicalExpiry !== undefined
          ? { medicalExpiry: medicalExpiry ? new Date(medicalExpiry) : null }
          : {}),
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Driver not found") return notFound(msg);
    return serverError();
  }
}
