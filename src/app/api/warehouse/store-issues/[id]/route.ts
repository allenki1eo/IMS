import { NextRequest } from "next/server";
import { getStoreIssueById } from "@/modules/warehouse/store-issues.service";
import { requirePermission } from "@/lib/api-helpers";
import { success, notFound } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "warehouse:issue:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const issue = await getStoreIssueById(id);
  if (!issue) return notFound("Store issue not found");
  return success(issue);
}
