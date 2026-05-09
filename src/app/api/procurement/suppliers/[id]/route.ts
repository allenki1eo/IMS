import { NextRequest } from "next/server";
import { getSupplier, updateSupplier } from "@/modules/procurement/suppliers.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "procurement:supplier:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const supplier = await getSupplier(companyId, id);
  if (!supplier) return notFound("Supplier not found");
  return success(supplier);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "procurement:supplier:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { ipAddress } = getRequestMeta(request);

  try {
    const supplier = await updateSupplier(
      companyId,
      id,
      {
        ...(body.code !== undefined ? { code: String(body.code).toUpperCase() } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.contactPerson !== undefined ? { contactPerson: body.contactPerson } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.taxNumber !== undefined ? { taxNumber: body.taxNumber } : {}),
        ...(body.paymentTerms !== undefined ? { paymentTerms: body.paymentTerms } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(supplier);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Supplier not found") return notFound(msg);
    if (msg.toLowerCase().includes("unique")) return badRequest("Supplier code already exists");
    return serverError();
  }
}

