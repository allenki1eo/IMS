import { NextRequest } from "next/server";
import { getReceiptById } from "@/modules/fuel/receipts.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, noContent, notFound, handleError } from "@/lib/response";

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "fuel:receipt:delete");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.fuelReceipt.findUnique({ where: { id } });
    if (!existing) return notFound("Fuel receipt not found");

    await db.fuelReceipt.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "FUEL_RECEIPT_DELETE",
      module: "fuel",
      resource: "receipt",
      recordId: id,
      oldValue: { reference: existing.reference, status: existing.status },
      description: `Deleted fuel receipt: ${existing.reference}`,
      ipAddress,
      companyId: existing.companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
