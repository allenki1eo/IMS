import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function generateRef(prefix: string): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

async function predictNextRefuel(
  vehicleId: string,
  currentOdometer: number | null,
  currentQuantity: number
) {
  const issues = await db.fuelIssue.findMany({
    where: { vehicleId, odometerReading: { not: null } },
    orderBy: { issuedAt: "desc" },
    take: 3,
  });

  const now = new Date();
  let avgKmPerLiter: number | null = null;
  let dailyKm: number | null = null;

  if (issues.length >= 2) {
    const sorted = [...issues].sort((a, b) => a.issuedAt.getTime() - b.issuedAt.getTime());
    const totalKm =
      (sorted[sorted.length - 1].odometerReading ?? 0) -
      (sorted[0].odometerReading ?? 0);
    const totalLiters = sorted.slice(0, -1).reduce((sum, i) => sum + i.quantityLiters, 0);
    const daysDiff = Math.max(
      1,
      (sorted[sorted.length - 1].issuedAt.getTime() - sorted[0].issuedAt.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (totalLiters > 0) {
      avgKmPerLiter = totalKm / totalLiters;
    }
    if (daysDiff > 0) {
      dailyKm = totalKm / daysDiff;
    }
  }

  if (avgKmPerLiter == null || avgKmPerLiter <= 0) avgKmPerLiter = 12;
  if (dailyKm == null || dailyKm <= 0) dailyKm = 50;

  const vehicle = await db.vehicle.findUnique({
    where: { id: vehicleId },
    select: { fuelTankCapacity: true },
  });
  const tankCapacity = vehicle?.fuelTankCapacity ?? currentQuantity;

  const rangeKm = tankCapacity * avgKmPerLiter;
  const daysUntilRefuel = Math.max(1, Math.round(rangeKm / dailyKm));

  const nextRefuelAt = new Date(now);
  nextRefuelAt.setDate(nextRefuelAt.getDate() + daysUntilRefuel);

  return { nextRefuelAt, avgKmPerLiter, lastRefuelAt: now };
}

export async function listIssues(
  companyId: string,
  params: {
    search?: string;
    tankId?: string;
    vehicleId?: string;
    driverId?: string;
    page: number;
    pageSize: number;
    from?: string;
    to?: string;
  }
) {
  const { search, tankId, vehicleId, driverId, page, pageSize, from, to } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(tankId ? { tankId } : {}),
    ...(vehicleId ? { vehicleId } : {}),
    ...(driverId ? { driverId } : {}),
    ...(from || to
      ? {
          issuedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search } },
            { notes: { contains: search } },
            { vehicle: { plateNumber: { contains: search } } },
          ],
        }
      : {}),
  };

  const [issues, total] = await Promise.all([
    db.fuelIssue.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { issuedAt: "desc" },
      include: {
        tank: {
          select: { id: true, name: true, code: true, fuelType: true },
        },
        vehicle: {
          select: { id: true, plateNumber: true, make: true, model: true, usageType: true, nextRefuelAt: true },
        },
        driver: {
          include: {
            employee: { select: { id: true, fullName: true } },
          },
        },
      },
    }),
    db.fuelIssue.count({ where }),
  ]);

  return { data: issues, meta: { total, page, pageSize } };
}

export async function getIssueById(id: string, companyId?: string) {
  const issue = await db.fuelIssue.findUnique({
    where: { id },
    include: {
      tank: {
        select: {
          id: true,
          name: true,
          code: true,
          fuelType: true,
          currentLevel: true,
          capacity: true,
        },
      },
      vehicle: {
        select: { id: true, plateNumber: true, make: true, model: true, odometer: true, usageType: true, fuelTankCapacity: true, lastRefuelAt: true, nextRefuelAt: true, averageConsumption: true },
      },
      driver: {
        include: {
          employee: { select: { id: true, fullName: true, employeeNumber: true, phone: true } },
        },
      },
    },
  });
  if (companyId && issue && issue.companyId !== companyId) return null;
  return issue;
}

export async function createIssue(params: {
  companyId: string;
  tankId: string;
  vehicleId: string;
  driverId?: string | null;
  tripId?: string | null;
  quantityLiters: number;
  pricePerLiter?: number | null;
  odometerReading?: number | null;
  notes?: string | null;
  issuedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { issuedById, userName, ipAddress, ...data } = params;

  const tank = await db.fuelTank.findUnique({ where: { id: data.tankId } });
  if (!tank) throw new Error("Fuel tank not found");
  if (tank.companyId !== data.companyId) throw new Error("Fuel tank not found");
  if (!tank.isActive) throw new Error("Fuel tank is inactive");
  if (tank.currentLevel < data.quantityLiters) {
    throw new Error(
      `Insufficient fuel in tank. Available: ${tank.currentLevel}L, Requested: ${data.quantityLiters}L`
    );
  }

  const vehicle = await db.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw new Error("Vehicle not found");
  if (vehicle.companyId !== data.companyId) throw new Error("Vehicle not found");

  const reference = generateRef("FIS");
  const totalCost =
    data.quantityLiters != null && data.pricePerLiter != null
      ? data.quantityLiters * data.pricePerLiter
      : null;

  const newTankLevel = tank.currentLevel - data.quantityLiters;

  const issueData = {
    companyId: data.companyId,
    tankId: data.tankId,
    vehicleId: data.vehicleId,
    driverId: data.driverId ?? null,
    tripId: data.tripId ?? null,
    reference,
    quantityLiters: data.quantityLiters,
    pricePerLiter: data.pricePerLiter ?? null,
    totalCost,
    odometerReading: data.odometerReading ?? null,
    issuedById,
    notes: data.notes ?? null,
    createdById: issuedById,
  };

  const issue = await db.$transaction(async (tx) => {
    const created = await tx.fuelIssue.create({ data: issueData });

    await tx.fuelTank.update({
      where: { id: tank.id },
      data: { currentLevel: newTankLevel },
    });

    if (data.odometerReading != null && data.odometerReading > vehicle.odometer) {
      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: { odometer: data.odometerReading },
      });
    }

    // Predict next refuel for private cars
    if (vehicle.usageType === "PRIVATE") {
      const prediction = await predictNextRefuel(
        vehicle.id,
        data.odometerReading ?? null,
        data.quantityLiters
      );
      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: {
          lastRefuelAt: prediction.lastRefuelAt,
          nextRefuelAt: prediction.nextRefuelAt,
          averageConsumption: prediction.avgKmPerLiter,
        },
      });
    }

    return created;
  });

  await createAuditLog({
    userId: issuedById,
    userName,
    action: "FUEL_ISSUED",
    module: "fuel",
    resource: "issue",
    recordId: issue.id,
    newValue: {
      reference,
      tankId: data.tankId,
      vehicleId: data.vehicleId,
      quantityLiters: data.quantityLiters,
      tankLevelAfter: newTankLevel,
    },
    description: `Issued ${data.quantityLiters}L fuel (${reference}) to vehicle ${vehicle.plateNumber}`,
    ipAddress,
    companyId: data.companyId,
  });

  return issue;
}
