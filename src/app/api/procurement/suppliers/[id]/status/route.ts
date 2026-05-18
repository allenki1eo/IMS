import { NextRequest } from "next/server";
import { updateSupplier } from "@/modules/procurement/suppliers.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError, handleError } from "@/lib/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "procurement:supplier:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { status } = await request.json();
  if (!["ACTIVE", "INACTIVE"].includes(status)) return badRequest("status must be ACTIVE or INACTIVE");

  const { ipAddress } = getRequestMeta(request);
  try {
    const supplier = await updateSupplier(
      companyId,
      id,
      { status },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(supplier);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Supplier not found") return notFound(msg);
    return handleError(err);
  }
}

