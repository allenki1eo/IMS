import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getRequestMeta, parseBody } from "@/lib/api-helpers";
import { getBrewingSessionById, updateBrewingSession } from "@/modules/brewing/brewing.service";
import { success, notFound, badRequest } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "brewing:session:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const session = await getBrewingSessionById(id);
  if (!session) return notFound("Brewing session not found");
  return success(session);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "brewing:session:write");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { body, error } = await parseBody(request);
  if (error) return error;

  const { ipAddress, userAgent } = getRequestMeta(request);

  const session = await updateBrewingSession({
    id,
    data: body as any,
    updatedById: auth.user.id,
    userName: auth.user.fullName,
    ipAddress,
    userAgent,
  });

  return success(session);
}
