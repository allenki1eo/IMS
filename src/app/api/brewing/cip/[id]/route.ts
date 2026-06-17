import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/api-helpers";
import { getCIPRecordById } from "@/modules/brewing/brewing.service";
import { success, notFound } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "brewing:cip:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const record = await getCIPRecordById(id);
  if (!record) return notFound("CIP record not found");
  return success(record);
}
