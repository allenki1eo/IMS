import { NextRequest } from "next/server";
import { deleteCashbookEntry } from "@/modules/finance/cashbook.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { noContent, notFound, handleError } from "@/lib/response";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:cashbook:write");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { ipAddress, userAgent } = getRequestMeta(request);
  try {
    await deleteCashbookEntry({ id, deletedById: auth.user.id, userName: auth.user.fullName, ipAddress, userAgent });
    return noContent();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "Entry not found") return notFound(msg);
    return handleError(err);
  }
}
