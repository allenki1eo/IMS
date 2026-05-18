import { NextRequest } from "next/server";
import { addVehicleDocument } from "@/modules/transport/vehicles.service";
import { requirePermission } from "@/lib/api-helpers";
import { created, badRequest, notFound, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:vehicle:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { documentType, documentNumber, issuedAt, expiresAt, notes } = body;

  if (!documentType || typeof documentType !== "string") {
    return badRequest("documentType is required");
  }

  try {
    const document = await addVehicleDocument({
      vehicleId: id,
      documentType,
      documentNumber: documentNumber ?? null,
      issuedAt: issuedAt ? new Date(issuedAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: notes ?? null,
      createdById: auth.user.id,
    });
    return created(document);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Vehicle not found") return notFound(msg);
    return handleError(err);
  }
}
