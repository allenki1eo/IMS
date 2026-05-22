import { NextRequest } from "next/server";
import { requirePermission, getCompanyId, getRequestMeta } from "@/lib/api-helpers";
import {
  listApiKeys,
  generateApiKey,
} from "@/modules/finance/tally.service";
import { success, created, badRequest, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:tally:manage");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const data = await listApiKeys(companyId);
    return success(data);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "finance:tally:manage");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  let body: { label?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.label?.trim()) return badRequest("Label is required");

  try {
    const { plainKey, id } = await generateApiKey(
      companyId,
      body.label.trim(),
      auth.user.id
    );
    return created({ id, plainKey, label: body.label.trim() });
  } catch (err) {
    return handleError(err);
  }
}
