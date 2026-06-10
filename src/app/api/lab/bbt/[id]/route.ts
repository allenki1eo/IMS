import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/api-helpers";
import { getBBTAnalysisById } from "@/modules/lab/lab.service";
import { success, notFound } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "lab:bbt:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const record = await getBBTAnalysisById(id);
  if (!record) return notFound("BBT analysis not found");
  return success(record);
}
