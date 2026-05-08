import { NextRequest } from "next/server";
import { getApprovalRequestById } from "@/modules/approvals/approvals.service";
import { requirePermission } from "@/lib/api-helpers";
import { success, notFound } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "approvals:request:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const approvalRequest = await getApprovalRequestById(id);
  if (!approvalRequest) return notFound("Approval request not found");

  return success(approvalRequest);
}
