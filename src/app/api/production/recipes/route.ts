import { NextRequest } from "next/server";
import { listProductionRecipes, createProductionRecipe } from "@/modules/production/recipes.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

type MaterialBody = {
  itemId?: string | null;
  itemCode?: string | null;
  description: string;
  quantity: number | string;
  uom?: string;
  wastagePct?: number | string;
};

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "production:recipe:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const { data, meta } = await listProductionRecipes(companyId, {
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });
  return paginated(data, buildMeta(meta.total, pagination));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "production:recipe:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  if (!body.code || typeof body.code !== "string") return badRequest("code is required");
  if (!body.name || typeof body.name !== "string") return badRequest("name is required");
  if (!body.productName || typeof body.productName !== "string") return badRequest("productName is required");
  if (!Array.isArray(body.materials) || body.materials.length === 0) return badRequest("At least one material is required");

  const { ipAddress } = getRequestMeta(request);
  try {
    const recipe = await createProductionRecipe(
      companyId,
      {
        code: body.code,
        name: body.name,
        productItemId: body.productItemId ?? null,
        productCode: body.productCode ?? null,
        productName: body.productName,
        batchSize: Number(body.batchSize),
        uom: body.uom ?? "L",
        version: body.version ?? "1",
        notes: body.notes ?? null,
        materials: body.materials.map((line: MaterialBody) => ({
          itemId: line.itemId ?? null,
          itemCode: line.itemCode ?? null,
          description: line.description,
          quantity: Number(line.quantity),
          uom: line.uom ?? "KG",
          wastagePct: line.wastagePct == null || line.wastagePct === "" ? 0 : Number(line.wastagePct),
        })),
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(recipe);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.toLowerCase().includes("unique")) return badRequest("Recipe code/version already exists");
    if (msg.includes("material")) return badRequest(msg);
    return serverError();
  }
}

