import { NextRequest } from "next/server";
import { listWorkflows, createWorkflow } from "@/modules/approvals/approvals.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, created, badRequest, serverError } from "@/lib/response";
import { z } from "zod";

const createWorkflowSchema = z.object({
  name: z.string().min(2),
  module: z.string(),
  resource: z.string(),
  description: z.string().optional(),
  steps: z.array(
    z.object({
      stepNumber: z.number(),
      name: z.string(),
      approverType: z.string().default("ANY_OF_ROLE"),
      approverRoleId: z.string().optional(),
      canDelegate: z.boolean().optional(),
      timeLimitHours: z.number().optional(),
    })
  ),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "approvals:workflow:manage");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const workflows = await listWorkflows(companyId);
  return success(workflows);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "approvals:workflow:manage");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const parsed = createWorkflowSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const workflow = await createWorkflow({
      ...parsed.data,
      companyId,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(workflow);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return serverError();
  }
}
