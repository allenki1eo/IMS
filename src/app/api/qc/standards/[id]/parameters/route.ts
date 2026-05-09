import { NextRequest } from "next/server";
import { addParameter } from "@/modules/qc/standards.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { created, badRequest, notFound, serverError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "qc:standard:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { name, unit, minValue, maxValue, targetValue, isRequired, sortOrder } = body;

  if (!name || typeof name !== "string") return badRequest("name is required");

  try {
    const parameter = await addParameter(companyId, id, {
      name,
      unit: unit ?? null,
      minValue: minValue ?? null,
      maxValue: maxValue ?? null,
      targetValue: targetValue ?? null,
      isRequired: isRequired ?? true,
      sortOrder: sortOrder ?? 0,
    });
    return created(parameter);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Quality standard not found") return notFound(msg);
    return serverError();
  }
}
