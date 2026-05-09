import { NextRequest } from "next/server";
import { updateParameter, removeParameter } from "@/modules/qc/standards.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, serverError } from "@/lib/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paramId: string }> }
) {
  const auth = await requirePermission(request, "qc:standard:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id, paramId } = await params;
  const body = await request.json();
  const { name, unit, minValue, maxValue, targetValue, isRequired, sortOrder } = body;

  try {
    const updated = await updateParameter(companyId, id, paramId, {
      ...(name !== undefined ? { name } : {}),
      ...(unit !== undefined ? { unit } : {}),
      ...(minValue !== undefined ? { minValue } : {}),
      ...(maxValue !== undefined ? { maxValue } : {}),
      ...(targetValue !== undefined ? { targetValue } : {}),
      ...(isRequired !== undefined ? { isRequired } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Quality standard not found" || msg === "Parameter not found") return notFound(msg);
    return serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paramId: string }> }
) {
  const auth = await requirePermission(request, "qc:standard:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id, paramId } = await params;

  try {
    await removeParameter(companyId, id, paramId);
    return noContent();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Quality standard not found" || msg === "Parameter not found") return notFound(msg);
    return serverError();
  }
}
