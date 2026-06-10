import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/api-helpers";
import { getBrewMaterialUsageById } from "@/modules/brewing/brewing.service";
import { success, notFound } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "brewing:material:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const usage = await getBrewMaterialUsageById(id);
  if (!usage) return notFound("Material usage record not found");
  return success(usage);
}
