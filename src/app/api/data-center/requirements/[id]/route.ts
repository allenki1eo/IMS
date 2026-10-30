import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";
import { updateRequirement } from "@/modules/data-center/data-center.service";
import { requirementUpdateSchema } from "@/modules/data-center/data-center.validation";
import { actorFrom, dataCenterError } from "../../_shared";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "data:requirement:manage");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  try {
    const input = requirementUpdateSchema.parse(await request.json());
    const updated = await updateRequirement(companyId, id, input, actorFrom(request, auth.user));
    if (!updated) return notFound("Requirement not found");
    return success(updated);
  } catch (err) {
    return dataCenterError(err);
  }
}
