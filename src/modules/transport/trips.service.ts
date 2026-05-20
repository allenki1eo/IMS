import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function generateRef(prefix: string): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export async function listTrips(
  companyId: string,
  params: {
    search?: string;
    status?: string;
    vehicleId?: string;
    driverId?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, status, vehicleId, driverId, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(vehicleId ? { vehicleId } : {}),
    ...(driverId ? { driverId } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search } },
            { origin: { contains: search } },
            { destination: { contains: search } },
            { cargoDescription: { contains: search } },
          ],
        }
      : {}),
  };

  const [trips, total] = await Promise.all([
    db.tripOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        vehicle: {
          select: { id: true, plateNumber: true, make: true, model: true },
        },
        trailer: {
          select: { id: true, plateNumber: true },
        },
        driver: {
          include: {
            employee: {
              select: { id: true, fullName: true, employeeNumber: true },
            },
          },
        },
      },
    }),
    db.tripOrder.count({ where }),
  ]);

  return { data: trips, meta: { total, page, pageSize } };
}

export async function getTripById(id: string) {
  return db.tripOrder.findUnique({
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
          odometer: true,
        },
      },
      trailer: {
        select: { id: true, plateNumber: true, make: true, model: true },
      },
      driver: {
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              employeeNumber: true,
              phone: true,
            },
          },
        },
      },
      logs: {
        orderBy: { eventTime: "asc" },
      },
      cargo: true,
    },
  });
}

export async function createTrip(params: {
  companyId: string;
  branchId?: string | null;
  vehicleId?: string | null;
  trailerId?: string | null;
  driverId?: string | null;
  origin: string;
  destination: string;
  scheduledDeparture?: Date | null;
  scheduledArrival?: Date | null;
  cargoDescription?: string | null;
  cargoWeight?: number | null;
  priority?: string;
  notes?: string | null;
  cargo?: {
    description: string;
    quantity?: number | null;
    uom?: string | null;
    itemId?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
  }[];
  createdById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { createdById, userName, ipAddress, cargo, ...data } = params;

  const reference = generateRef("TRP");

  const trip = await db.tripOrder.create({
    data: {
      companyId: data.companyId,
      branchId: data.branchId ?? null,
      reference,
      vehicleId: data.vehicleId ?? null,
      trailerId: data.trailerId ?? null,
      driverId: data.driverId ?? null,
      origin: data.origin,
      destination: data.destination,
      scheduledDeparture: data.scheduledDeparture ?? null,
      scheduledArrival: data.scheduledArrival ?? null,
      cargoDescription: data.cargoDescription ?? null,
      cargoWeight: data.cargoWeight ?? null,
      priority: data.priority ?? "NORMAL",
      notes: data.notes ?? null,
      status: "PLANNED",
      createdById,
      ...(cargo && cargo.length > 0
        ? {
            cargo: {
              create: cargo.map((c) => ({
                description: c.description,
                quantity: c.quantity ?? null,
                uom: c.uom ?? null,
                itemId: c.itemId ?? null,
                referenceType: c.referenceType ?? null,
                referenceId: c.referenceId ?? null,
              })),
            },
          }
        : {}),
    },
    include: {
      cargo: true,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "TRIP_CREATE",
    module: "transport",
    resource: "trip",
    recordId: trip.id,
    newValue: {
      reference,
      origin: data.origin,
      destination: data.destination,
      vehicleId: data.vehicleId ?? undefined,
      driverId: data.driverId ?? undefined,
    },
    description: `Created trip: ${reference} from ${data.origin} to ${data.destination}`,
    ipAddress,
    companyId: data.companyId,
  });

  return trip;
}

export async function updateTrip(params: {
  id: string;
  data: {
    vehicleId?: string | null;
    driverId?: string | null;
    origin?: string;
    destination?: string;
    scheduledDeparture?: Date | null;
    scheduledArrival?: Date | null;
    cargoDescription?: string | null;
    cargoWeight?: number | null;
    priority?: string;
    notes?: string | null;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, data, updatedById, userName, ipAddress } = params;

  const existing = await db.tripOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Trip not found");
  if (existing.status !== "PLANNED") throw new Error("Only PLANNED trips can be updated");

  const updated = await db.tripOrder.update({ where: { id }, data });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "TRIP_UPDATE",
    module: "transport",
    resource: "trip",
    recordId: id,
    oldValue: {
      origin: existing.origin,
      destination: existing.destination,
      vehicleId: existing.vehicleId ?? undefined,
      driverId: existing.driverId ?? undefined,
    },
    newValue: data as Record<string, unknown>,
    description: `Updated trip: ${existing.reference}`,
    ipAddress,
    companyId: existing.companyId,
  });

  return updated;
}

export async function dispatchTrip(params: {
  id: string;
  actualDeparture?: Date | null;
  odometer?: number | null;
  dispatchedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, actualDeparture, odometer, dispatchedById, userName, ipAddress } = params;

  const existing = await db.tripOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Trip not found");
  if (existing.status !== "PLANNED") throw new Error("Only PLANNED trips can be dispatched");

  const departureTime = actualDeparture ?? new Date();

  await db.$transaction(async (tx) => {
    await tx.tripOrder.update({
      where: { id },
      data: {
        status: "DISPATCHED",
        actualDeparture: departureTime,
      },
    });
    await tx.tripLog.create({
      data: {
        tripId: id,
        eventType: "DEPARTURE",
        eventTime: departureTime,
        odometer: odometer ?? null,
        notes: "Trip dispatched",
        recordedById: dispatchedById,
      },
    });
    if (odometer !== undefined && odometer !== null && existing.vehicleId) {
      await tx.vehicle.update({
        where: { id: existing.vehicleId },
        data: { odometer },
      });
    }
  });

  await createAuditLog({
    userId: dispatchedById,
    userName,
    action: "TRIP_DISPATCHED",
    module: "transport",
    resource: "trip",
    recordId: id,
    oldValue: { status: "PLANNED" },
    newValue: { status: "DISPATCHED", actualDeparture: departureTime.toISOString() },
    description: `Dispatched trip: ${existing.reference}`,
    ipAddress,
    companyId: existing.companyId,
  });

  return db.tripOrder.findUnique({ where: { id } });
}

export async function completeTrip(params: {
  id: string;
  actualArrival?: Date | null;
  odometer?: number | null;
  notes?: string | null;
  completedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, actualArrival, odometer, notes, completedById, userName, ipAddress } = params;

  const existing = await db.tripOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Trip not found");
  if (existing.status !== "DISPATCHED") throw new Error("Only DISPATCHED trips can be completed");

  const arrivalTime = actualArrival ?? new Date();

  await db.$transaction(async (tx) => {
    await tx.tripOrder.update({
      where: { id },
      data: {
        status: "COMPLETED",
        actualArrival: arrivalTime,
      },
    });
    await tx.tripLog.create({
      data: {
        tripId: id,
        eventType: "ARRIVAL",
        eventTime: arrivalTime,
        odometer: odometer ?? null,
        notes: notes ?? "Trip completed",
        recordedById: completedById,
      },
    });
    if (odometer !== undefined && odometer !== null && existing.vehicleId) {
      await tx.vehicle.update({
        where: { id: existing.vehicleId },
        data: { odometer },
      });
    }
  });

  await createAuditLog({
    userId: completedById,
    userName,
    action: "TRIP_COMPLETED",
    module: "transport",
    resource: "trip",
    recordId: id,
    oldValue: { status: "DISPATCHED" },
    newValue: { status: "COMPLETED", actualArrival: arrivalTime.toISOString() },
    description: `Completed trip: ${existing.reference}`,
    ipAddress,
    companyId: existing.companyId,
  });

  return db.tripOrder.findUnique({ where: { id } });
}

export async function cancelTrip(params: {
  id: string;
  reason: string;
  cancelledById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, reason, cancelledById, userName, ipAddress } = params;

  const existing = await db.tripOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Trip not found");
  if (existing.status !== "PLANNED") throw new Error("Only PLANNED trips can be cancelled");

  const updated = await db.tripOrder.update({
    where: { id },
    data: {
      status: "CANCELLED",
      notes: existing.notes ? `${existing.notes}\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`,
    },
  });

  await createAuditLog({
    userId: cancelledById,
    userName,
    action: "TRIP_CANCELLED",
    module: "transport",
    resource: "trip",
    recordId: id,
    oldValue: { status: "PLANNED" },
    newValue: { status: "CANCELLED", reason },
    description: `Cancelled trip: ${existing.reference}. Reason: ${reason}`,
    ipAddress,
    companyId: existing.companyId,
  });

  return updated;
}

export async function addTripLog(params: {
  tripId: string;
  eventType: string;
  location?: string | null;
  odometer?: number | null;
  notes?: string | null;
  recordedById: string;
}) {
  const { tripId, eventType, location, odometer, notes, recordedById } = params;

  const trip = await db.tripOrder.findUnique({ where: { id: tripId } });
  if (!trip) throw new Error("Trip not found");

  return db.tripLog.create({
    data: {
      tripId,
      eventType,
      eventTime: new Date(),
      location: location ?? null,
      odometer: odometer ?? null,
      notes: notes ?? null,
      recordedById,
    },
  });
}
