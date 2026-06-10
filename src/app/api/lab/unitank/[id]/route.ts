import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/api-helpers";
import { getUnitankAnalysisById } from "@/modules/lab/lab.service";
import { success, notFound } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "lab:unitank:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const record = await getUnitankAnalysisById(id);
  if (!record) return notFound("Unitank analysis not found");
  return success(record);
}
