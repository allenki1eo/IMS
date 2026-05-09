import { NextRequest } from "next/server";
import { getGRNById } from "@/modules/warehouse/grn.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:grn:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const grn = await getGRNById(id);
  if (!grn) return notFound("GRN not found");
  if (grn.companyId !== companyId) return notFound("GRN not found");
  return success(grn);
}
