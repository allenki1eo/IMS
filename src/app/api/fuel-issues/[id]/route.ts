import { NextRequest } from "next/server";
import { getIssueById } from "@/modules/fuel/issues.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "fuel:issue:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const issue = await getIssueById(id, companyId);
  if (!issue) return notFound("Fuel issue not found");

  return success(issue);
}
