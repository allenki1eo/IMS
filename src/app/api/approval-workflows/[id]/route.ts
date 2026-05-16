import { NextRequest } from "next/server";
import { getWorkflowById } from "@/modules/approvals/approvals.service";
import { requirePermission } from "@/lib/api-helpers";
import { success, notFound , serverError} from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "approvals:workflow:manage");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    const workflow = await getWorkflowById(id);
    if (!workflow) return notFound("Approval workflow not found");

    return success(workflow);
  } catch (err) {
    console.error("[API Error]", err);
    return serverError();
  }
}
