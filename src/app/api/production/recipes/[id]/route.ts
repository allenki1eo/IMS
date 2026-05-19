import { NextRequest } from "next/server";
import { getProductionRecipe } from "@/modules/production/recipes.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:recipe:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const recipe = await getProductionRecipe(companyId, id);
  if (!recipe) return notFound("Production recipe not found");
  return success(recipe);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:recipe:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.productionRecipe.findFirst({ where: { id, companyId } });
    if (!existing) return notFound("Production recipe not found");

    await db.productionRecipe.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "PRODUCTION_RECIPE_DELETE",
      module: "production",
      resource: "recipe",
      recordId: id,
      oldValue: { code: existing.code, name: existing.name },
      description: `Deleted production recipe: ${existing.name} (${existing.code})`,
      ipAddress,
      companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}

