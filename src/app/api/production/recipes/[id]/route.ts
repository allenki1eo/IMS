import { NextRequest } from "next/server";
import { getProductionRecipe } from "@/modules/production/recipes.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:recipe:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const recipe = await getProductionRecipe(companyId, id);
  if (!recipe) return notFound("Production recipe not found");
  return success(recipe);
}

