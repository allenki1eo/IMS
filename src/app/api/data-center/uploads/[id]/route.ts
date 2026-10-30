import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";
import { getUpload } from "@/modules/data-center/data-center.service";
import { dataCenterError } from "../../_shared";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "data:upload:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  try {
    const upload = await getUpload(companyId, id);
    if (!upload) return notFound("Upload not found");
    return success(upload);
  } catch (err) {
    return dataCenterError(err);
  }
}
