import { NextRequest } from "next/server";
import { getWorkflowById, updateWorkflow } from "@/modules/approvals/approvals.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, notFound, badRequest, serverError, handleError } from "@/lib/response";

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
    return handleError(err);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "approvals:workflow:manage");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { name, description, steps } = body;

  if (!name) return badRequest("Name is required");
  if (!Array.isArray(steps)) return badRequest("Steps must be an array");

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateWorkflow({
      id,
      name,
      description,
      steps,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Approval workflow not found") return notFound(msg);
    return handleError(err);
  }
}
