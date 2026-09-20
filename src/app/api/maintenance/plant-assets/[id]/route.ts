import { NextRequest } from "next/server";
import {
  getPlantAsset,
  updatePlantAsset,
} from "@/modules/maintenance/plant-assets.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "maintenance:workorder:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  try {
    const asset = await getPlantAsset(companyId, id);
    if (!asset) return notFound("Plant asset not found");
    return success(asset);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "maintenance:workorder:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { ipAddress } = getRequestMeta(request);

  try {
    const asset = await updatePlantAsset(
      companyId,
      id,
      {
        name: body.name,
        category: body.category,
        location: body.location,
        notes: body.notes,
        status: body.status,
        isActive: body.isActive,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(asset);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Plant asset not found") return notFound(msg);
    if (msg.includes("category must be")) return badRequest(msg);
    return handleError(err);
  }
}
