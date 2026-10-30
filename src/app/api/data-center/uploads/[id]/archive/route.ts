import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";
import { archiveUpload } from "@/modules/data-center/data-center.service";
import { actorFrom, dataCenterError } from "../../../_shared";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "data:upload:archive");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  try {
    const result = await archiveUpload(companyId, id, actorFrom(request, auth.user));
    if (!result) return notFound("Upload not found");
    return success(result);
  } catch (err) {
    return dataCenterError(err);
  }
}
