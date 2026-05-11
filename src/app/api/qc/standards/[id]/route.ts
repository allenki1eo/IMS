import { NextRequest } from "next/server";
import { getStandard, updateStandard } from "@/modules/qc/standards.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "qc:standard:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const standard = await getStandard(companyId, id);
  if (!standard) return notFound("Quality standard not found");

  return success(standard);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "qc:standard:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { code, name, itemId, description, isActive } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateStandard(
      companyId,
      id,
      {
        ...(code !== undefined ? { code } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(itemId !== undefined ? { itemId } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Quality standard not found") return notFound(msg);
    if (msg === "Item not found" || msg === "A standard with this code already exists")
      return badRequest(msg);
    return serverError();
  }
}
