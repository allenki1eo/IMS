import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/api-helpers";
import { getMicroReportById } from "@/modules/lab/lab.service";
import { success, notFound } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "lab:micro:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const report = await getMicroReportById(id);
  if (!report) return notFound("Micro report not found");
  return success(report);
}
