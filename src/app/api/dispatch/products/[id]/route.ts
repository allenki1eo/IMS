import { NextRequest } from "next/server";
import { getProduct, updateProduct } from "@/modules/dispatch/products.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, handleError } from "@/lib/response";

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
    if (
      msg === "A product with this code already exists" ||
      msg === "Product code is required" ||
      msg === "Product name is required" ||
      msg === "Unit price cannot be negative"
    ) return badRequest(msg);
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "dispatch:product:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.fGProduct.findFirst({ where: { id, companyId } });
    if (!existing) return notFound("Product not found");

    const lotCount = await db.fGLot.count({ where: { productId: id } });
    if (lotCount > 0) return badRequest("Products with inventory lots cannot be deleted");

    const lineCount = await db.dispatchOrderLine.count({ where: { productId: id } });
    if (lineCount > 0) return badRequest("Products linked to dispatch orders cannot be deleted");

    await db.fGProduct.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "FG_PRODUCT_DELETE",
      module: "dispatch",
      resource: "product",
      recordId: id,
      oldValue: { code: existing.code, name: existing.name },
      description: `Deleted FG product: ${existing.name} (${existing.code})`,
      ipAddress,
      companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
