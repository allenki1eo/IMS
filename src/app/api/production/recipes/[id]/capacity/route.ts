import { NextRequest } from "next/server";
import { calculateRecipeCapacity } from "@/modules/production/recipes.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:recipe:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const capacity = await calculateRecipeCapacity(companyId, id);
  if (!capacity) return notFound("Recipe not found");

  return success(capacity);
}
