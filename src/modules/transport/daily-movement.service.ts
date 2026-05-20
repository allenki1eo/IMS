import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function generateRef(): string {
  const d = new Date();
  return `DTM-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

function calcCounts(entries: { vehicleStatus: string }[]) {
  let onTrip = 0, present = 0, maintenance = 0, offsite = 0, other = 0;
  for (const e of entries) {
    if (e.vehicleStatus === "ON_TRIP") onTrip++;
    else if (e.vehicleStatus === "PRESENT") present++;
    else if (e.vehicleStatus === "MAINTENANCE") maintenance++;
    else if (e.vehicleStatus === "OFFSITE") offsite++;
    else other++;
  }
  return { onTrip, present, maintenance, offsite, other, totalVehicles: entries.length };
}

export async function listDailyMovements(
  companyId: string,
  params: { page: number; pageSize: number }
) {
  const { page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = { companyId };

  const [reports, total] = await Promise.all([
    db.dailyTruckMovement.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { reportDate: "desc" },
    }),
    db.dailyTruckMovement.count({ where }),
  ]);

  return { data: reports, meta: { total, page, pageSize } };
}

export async function getDailyMovementById(id: string) {
  return db.dailyTruckMovement.findUnique({
    where: { id },
    include: {
      entries: {
        include: {
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              make: true,
              model: true,
              vehicleType: true,
            },
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              licenseNumber: true,
              employee: {
                select: { id: true, fullName: true, employeeNumber: true },
              },
            },
          },
          trip: {
            select: {
              id: true,
              origin: true,
              destination: true,
              actualDeparture: true,
              scheduledDeparture: true,
              currentLocation: true,
              cargoDescription: true,
              trailer: { select: { plateNumber: true } },
              cargo: { select: { description: true } },
              logs: {
                orderBy: { eventTime: "desc" },
                take: 1,
                select: { location: true },
              },
            },
          },
        },
        orderBy: { vehicle: { plateNumber: "asc" } },
      },
    },
  });
}

export async function getTodayMovement(companyId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Check for an existing report for today
  const existing = await db.dailyTruckMovement.findFirst({
    where: {
      companyId,
      reportDate: { gte: todayStart, lte: todayEnd },
    },
    include: {
      entries: {
        include: {
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              make: true,
              model: true,
              vehicleType: true,
            },
          },
          driver: {
            include: {
              employee: {
                select: { id: true, fullName: true, employeeNumber: true },
              },
            },
          },
        },
        orderBy: { vehicle: { plateNumber: "asc" } },
      },
    },
  });

  if (existing) {
    return { report: existing, vehicles: null, activeTrips: null };
  }

  // No report yet — fetch vehicles and active trips for pre-population
  const [vehicles, activeTrips] = await Promise.all([
    db.vehicle.findMany({
      where: { companyId, isActive: true },
      orderBy: { plateNumber: "asc" },
      select: {
        id: true,
        plateNumber: true,
        make: true,
        model: true,
        vehicleType: true,
      },
    }),
    db.tripOrder.findMany({
      where: { companyId, status: "DISPATCHED" },
      select: {
        id: true,
        vehicleId: true,
        driverId: true,
        destination: true,
        actualDeparture: true,
        scheduledArrival: true,
      },
    }),
  ]);

  return { report: null, vehicles, activeTrips };
}

export async function createDailyMovement(params: {
  companyId: string;
  reportDate: Date;
  entries: Array<{
    vehicleId: string;
    driverId?: string | null;
    vehicleStatus: string;
    tripId?: string | null;
    destination?: string | null;
    departureTime?: Date | null;
    expectedReturn?: Date | null;
    odometerOut?: number | null;
    fuelLevel?: string | null;
    remarks?: string | null;
  }>;
  notes?: string | null;
  createdById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { companyId, entries, notes, createdById, userName, ipAddress } = params;
  // Normalize to midnight so @@unique([companyId, reportDate]) works as a per-day constraint
  const reportDate = new Date(params.reportDate);
  reportDate.setHours(0, 0, 0, 0);
  const reference = generateRef();
  const counts = calcCounts(entries);

  const report = await db.$transaction(async (tx) => {
    const created = await tx.dailyTruckMovement.create({
      data: {
        companyId,
        reportDate,
        reference,
        status: "DRAFT",
        notes: notes ?? null,
        createdById,
        ...counts,
        entries: {
          create: entries.map((e) => ({
            vehicleId: e.vehicleId,
            driverId: e.driverId ?? null,
            vehicleStatus: e.vehicleStatus,
            tripId: e.tripId ?? null,
            destination: e.destination ?? null,
            departureTime: e.departureTime ?? null,
            expectedReturn: e.expectedReturn ?? null,
            odometerOut: e.odometerOut ?? null,
            fuelLevel: e.fuelLevel ?? null,
            remarks: e.remarks ?? null,
          })),
        },
      },
    });
    return created;
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "DAILY_MOVEMENT_CREATE",
    module: "transport",
    resource: "daily-movement",
    recordId: report.id,
    newValue: { reference, reportDate: reportDate.toISOString(), totalVehicles: counts.totalVehicles },
    description: `Created daily truck movement report: ${reference}`,
    ipAddress,
    companyId,
  });

  return report;
}

export async function updateDailyMovement(params: {
  id: string;
  entries: Array<{
    vehicleId: string;
    driverId?: string | null;
    vehicleStatus: string;
    tripId?: string | null;
    destination?: string | null;
    departureTime?: Date | null;
    expectedReturn?: Date | null;
    odometerOut?: number | null;
    fuelLevel?: string | null;
    remarks?: string | null;
  }>;
  notes?: string | null;
  updatedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, entries, notes, updatedById, userName, ipAddress } = params;

  const existing = await db.dailyTruckMovement.findUnique({ where: { id } });
  if (!existing) throw new Error("Report not found");
  if (existing.status !== "DRAFT") throw new Error("Only DRAFT reports can be updated");

  const counts = calcCounts(entries);

  const updated = await db.$transaction(async (tx) => {
    await tx.dailyTruckMovementEntry.deleteMany({ where: { reportId: id } });
    return tx.dailyTruckMovement.update({
      where: { id },
      data: {
        notes: notes ?? null,
        ...counts,
        entries: {
          create: entries.map((e) => ({
            vehicleId: e.vehicleId,
            driverId: e.driverId ?? null,
            vehicleStatus: e.vehicleStatus,
            tripId: e.tripId ?? null,
            destination: e.destination ?? null,
            departureTime: e.departureTime ?? null,
            expectedReturn: e.expectedReturn ?? null,
            odometerOut: e.odometerOut ?? null,
            fuelLevel: e.fuelLevel ?? null,
            remarks: e.remarks ?? null,
          })),
        },
      },
    });
  });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "DAILY_MOVEMENT_UPDATE",
    module: "transport",
    resource: "daily-movement",
    recordId: id,
    oldValue: { totalVehicles: existing.totalVehicles },
    newValue: { totalVehicles: counts.totalVehicles },
    description: `Updated daily truck movement report: ${existing.reference}`,
    ipAddress,
    companyId: existing.companyId,
  });

  return updated;
}

export async function submitDailyMovement(params: {
  id: string;
  submittedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, submittedById, userName, ipAddress } = params;

  const existing = await db.dailyTruckMovement.findUnique({ where: { id } });
  if (!existing) throw new Error("Report not found");
  if (existing.status !== "DRAFT") throw new Error("Only DRAFT reports can be submitted");

  const updated = await db.dailyTruckMovement.update({
    where: { id },
    data: {
      status: "SUBMITTED",
      submittedById,
      submittedAt: new Date(),
    },
  });

  await createAuditLog({
    userId: submittedById,
    userName,
    action: "DAILY_MOVEMENT_SUBMIT",
    module: "transport",
    resource: "daily-movement",
    recordId: id,
    oldValue: { status: "DRAFT" },
    newValue: { status: "SUBMITTED" },
    description: `Submitted daily truck movement report: ${existing.reference}`,
    ipAddress,
    companyId: existing.companyId,
  });

  return updated;
}
