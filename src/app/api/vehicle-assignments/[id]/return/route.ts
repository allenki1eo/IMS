import { NextRequest } from "next/server";
import { returnAssignment } from "@/modules/transport/assignments.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:assignment:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { notes } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const assignment = await returnAssignment({
      id,
      notes: notes ?? null,
      returnedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(assignment);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Assignment not found") return notFound(msg);
    if (msg === "Assignment already returned") return badRequest(msg);
    return handleError(err);
  }
}
