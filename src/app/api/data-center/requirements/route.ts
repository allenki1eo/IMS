import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, created, badRequest } from "@/lib/response";
import { createRequirement, listRequirements } from "@/modules/data-center/data-center.service";
import { requirementSchema } from "@/modules/data-center/data-center.validation";
import { actorFrom, dataCenterError } from "../_shared";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "data:upload:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
    return success(await listRequirements(companyId, includeInactive));
  } catch (err) {
    return dataCenterError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "data:requirement:manage");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const input = requirementSchema.parse(await request.json());
    return created(await createRequirement(companyId, input, actorFrom(request, auth.user)));
  } catch (err) {
    return dataCenterError(err);
  }
}
