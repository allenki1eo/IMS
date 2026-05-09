import { NextRequest } from "next/server";
import { getProductionLine } from "@/modules/production/lines.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:line:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const line = await getProductionLine(companyId, id);
  if (!line) return notFound("Production line not found");
  return success(line);
}

