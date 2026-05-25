import { NextRequest } from "next/server";
import { addLine } from "@/modules/dispatch/orders.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { created, badRequest, notFound, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "dispatch:order:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { lotId, productId, description, quantity, uom, unitPrice } = body;

  if (!description || typeof description !== "string")
    return badRequest("description is required");
  if (!quantity || typeof quantity !== "number" || quantity <= 0)
    return badRequest("quantity must be a positive number");

  try {
    const line = await addLine(companyId, id, {
      lotId: lotId ?? null,
      productId: productId ?? null,
      description,
      quantity,
      uom: uom ?? null,
      unitPrice: unitPrice ?? null,
    });
    return created(line);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Dispatch order not found") return notFound(msg);
    if (
      msg === "Lines can only be added to DRAFT orders" ||
      msg === "Lot not found" ||
      msg === "Product not found" ||
      msg === "Product is inactive" ||
      msg === "Lot is not available" ||
      msg === "Selected product does not match the lot" ||
      msg === "Unit price cannot be negative" ||
      msg === "Quantity must be greater than zero" ||
      msg.startsWith("Insufficient quantity")
    )
      return badRequest(msg);
    return handleError(err);
  }
}
