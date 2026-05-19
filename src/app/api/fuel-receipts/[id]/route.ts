import { NextRequest } from "next/server";
import { getReceiptById } from "@/modules/fuel/receipts.service";
import { requirePermission } from "@/lib/api-helpers";
import { success, notFound } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "fuel:receipt:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const receipt = await getReceiptById(id);
  if (!receipt) return notFound("Fuel receipt not found");

  return success(receipt);
}
