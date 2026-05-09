import { NextRequest } from "next/server";
import { getPart, updatePart } from "@/modules/maintenance/parts.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "maintenance:spare_part:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const part = await getPart(companyId, id);
  if (!part) return notFound("Spare part not found");

  return success(part);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "maintenance:spare_part:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const {
    categoryId,
    code,
    name,
    description,
    partNumber,
    uom,
    minStock,
    unitCost,
    isActive,
  } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updatePart(
      companyId,
      id,
      {
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(partNumber !== undefined ? { partNumber } : {}),
        ...(uom !== undefined ? { uom } : {}),
        ...(minStock !== undefined ? { minStock } : {}),
        ...(unitCost !== undefined ? { unitCost } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Spare part not found") return notFound(msg);
    if (msg === "Spare part category not found") return badRequest(msg);
    if (msg.toLowerCase().includes("unique")) return badRequest("Spare part code already exists");
    return serverError();
  }
}
