import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listIncidents(
  companyId: string,
  params: {
    search?: string;
    vehicleId?: string;
    tripId?: string;
    incidentType?: string;
    status?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, vehicleId, tripId, incidentType, status, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(vehicleId ? { vehicleId } : {}),
    ...(tripId ? { tripId } : {}),
    ...(incidentType ? { incidentType } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { description: { contains: search } },
            { location: { contains: search } },
            { vehicle: { plateNumber: { contains: search } } },
          ],
        }
      : {}),
  };

  const [incidents, total] = await Promise.all([
    db.vehicleIncident.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { incidentDate: "desc" },
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            make: true,
            model: true,
          },
        },
        trip: {
          select: { id: true, reference: true },
        },
      },
    }),
    db.vehicleIncident.count({ where }),
  ]);

  return { data: incidents, meta: { total, page, pageSize } };
}

export async function getIncidentById(id: string) {
  return db.vehicleIncident.findUnique({
    where: { id },
    include: {
      vehicle: {
        select: {
          id: true,
          plateNumber: true,
          make: true,
          model: true,
          vehicleType: true,
          status: true,
        },
      },
      trip: {
        select: {
          id: true,
          reference: true,
          origin: true,
          destination: true,
          status: true,
        },
      },
    },
  });
}

export async function createIncident(params: {
  companyId: string;
  vehicleId: string;
  tripId?: string | null;
  incidentType: string;
  incidentDate: Date;
  location?: string | null;
  description: string;
  reportedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { reportedById, userName, ipAddress, ...data } = params;

  const vehicle = await db.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw new Error("Vehicle not found");

  if (data.tripId) {
    const trip = await db.tripOrder.findUnique({ where: { id: data.tripId } });
    if (!trip) throw new Error("Trip not found");
  }

  const incident = await db.vehicleIncident.create({
    data: {
      companyId: data.companyId,
      vehicleId: data.vehicleId,
      tripId: data.tripId ?? null,
      incidentType: data.incidentType,
      incidentDate: data.incidentDate,
      location: data.location ?? null,
      description: data.description,
      reportedById,
      status: "OPEN",
    },
  });

  // If breakdown, set vehicle to IN_REPAIR
  if (data.incidentType === "BREAKDOWN") {
    await db.vehicle.update({
      where: { id: data.vehicleId },
      data: { status: "IN_REPAIR" },
    });
  }

  await createAuditLog({
    userId: reportedById,
    userName,
    action: "INCIDENT_REPORTED",
    module: "transport",
    resource: "incident",
    recordId: incident.id,
    newValue: {
      vehicleId: data.vehicleId,
      plateNumber: vehicle.plateNumber,
      incidentType: data.incidentType,
      incidentDate: data.incidentDate.toISOString(),
    },
    description: `Reported ${data.incidentType} incident for vehicle ${vehicle.plateNumber}`,
    ipAddress,
    companyId: data.companyId,
  });

  return incident;
}

export async function updateIncident(params: {
  id: string;
  data: {
    status?: string;
    resolutionNotes?: string | null;
    resolvedAt?: Date | null;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, data, updatedById, userName, ipAddress } = params;

  const existing = await db.vehicleIncident.findUnique({
    where: { id },
    include: {
      vehicle: { select: { id: true, plateNumber: true, status: true } },
    },
  });
  if (!existing) throw new Error("Incident not found");

  const updated = await db.vehicleIncident.update({ where: { id }, data });

  // If resolving and vehicle was in repair due to this breakdown, restore to ACTIVE
  if (
    data.status === "RESOLVED" &&
    existing.status !== "RESOLVED" &&
    existing.incidentType === "BREAKDOWN" &&
    existing.vehicle.status === "IN_REPAIR"
  ) {
    await db.vehicle.update({
      where: { id: existing.vehicleId },
      data: { status: "ACTIVE" },
    });
  }

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "INCIDENT_UPDATED",
    module: "transport",
    resource: "incident",
    recordId: id,
    oldValue: { status: existing.status },
    newValue: data as Record<string, unknown>,
    description: `Updated incident for vehicle ${existing.vehicle.plateNumber}${data.status ? `: status changed to ${data.status}` : ""}`,
    ipAddress,
    companyId: existing.companyId,
  });

  return updated;
}
