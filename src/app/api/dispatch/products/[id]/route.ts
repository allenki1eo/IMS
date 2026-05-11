import { NextRequest } from "next/server";
import { getProduct, updateProduct } from "@/modules/dispatch/products.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "dispatch:product:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const product = await getProduct(companyId, id);
  if (!product) return notFound("Product not found");

  return success(product);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "dispatch:product:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { code, name, description, uom, unitPrice, isActive } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateProduct(
      companyId,
      id,
      {
        ...(code !== undefined ? { code } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(uom !== undefined ? { uom } : {}),
        ...(unitPrice !== undefined ? { unitPrice } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Product not found") return notFound(msg);
    if (msg === "A product with this code already exists") return badRequest(msg);
    return serverError();
  }
}
