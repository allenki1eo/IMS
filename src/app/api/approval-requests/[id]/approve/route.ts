import { NextRequest } from "next/server";
import { approveStep } from "@/modules/approvals/approvals.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";
import { z } from "zod";

const schema = z.object({ comments: z.string().optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "approvals:request:approve");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const result = await approveStep({
      requestId: id,
      userId: auth.user.id,
      userName: auth.user.fullName,
      comments: parsed.data.comments,
      ipAddress,
      userAgent,
    });
    return success({ status: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Approval request not found") return notFound(msg);
    return badRequest(msg);
  }
}
