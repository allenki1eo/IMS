import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listAssignments(
  params: {
    vehicleId?: string;
    driverId?: string;
    status?: string;
    page: number;
    pageSize: number;
  }
) {
  const { vehicleId, driverId, status, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(vehicleId ? { vehicleId } : {}),
    ...(driverId ? { driverId } : {}),
    ...(status ? { status } : {}),
  };

  const [assignments, total] = await Promise.all([
    db.vehicleAssignment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { assignedAt: "desc" },
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
      },
    }),
    db.vehicleAssignment.count({ where }),
  ]);

  return { data: assignments, meta: { total, page, pageSize } };
}

export async function createAssignment(params: {
  vehicleId: string;
  driverId: string;
  notes?: string | null;
  assignedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { vehicleId, driverId, notes, assignedById, userName, ipAddress } = params;

  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new Error("Vehicle not found");
  if (vehicle.status !== "ACTIVE") throw new Error("Vehicle is not active");

  const driver = await db.driver.findUnique({
    where: { id: driverId },
    include: { employee: { select: { fullName: true } } },
  });
  if (!driver) throw new Error("Driver not found");
  if (!driver.isAvailable) throw new Error("Driver is not available");

  const [assignment] = await db.$transaction([
    db.vehicleAssignment.create({
      data: {
        vehicleId,
        driverId,
        assignedById,
        notes: notes ?? null,
        status: "ACTIVE",
      },
    }),
    db.driver.update({
      where: { id: driverId },
      data: { isAvailable: false },
    }),
  ]);

  await createAuditLog({
    userId: assignedById,
    userName,
    action: "VEHICLE_ASSIGNED",
    module: "transport",
    resource: "vehicle_assignment",
    recordId: assignment.id,
    newValue: { vehicleId, driverId, plateNumber: vehicle.plateNumber },
    description: `Assigned vehicle ${vehicle.plateNumber} to driver ${driver.employee.fullName}`,
    ipAddress,
    companyId: vehicle.companyId,
  });

  return assignment;
}

export async function returnAssignment(params: {
  id: string;
  notes?: string | null;
  returnedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, notes, returnedById, userName, ipAddress } = params;

  const assignment = await db.vehicleAssignment.findUnique({
    where: { id },
    include: {
      vehicle: { select: { id: true, plateNumber: true, companyId: true } },
      driver: {
        include: { employee: { select: { fullName: true } } },
      },
    },
  });
  if (!assignment) throw new Error("Assignment not found");
  if (assignment.status === "RETURNED") throw new Error("Assignment already returned");

  await db.$transaction([
    db.vehicleAssignment.update({
      where: { id },
      data: {
        status: "RETURNED",
        returnedAt: new Date(),
        notes: notes ? (assignment.notes ? `${assignment.notes}\n${notes}` : notes) : assignment.notes,
      },
    }),
    db.driver.update({
      where: { id: assignment.driverId },
      data: { isAvailable: true },
    }),
  ]);

  await createAuditLog({
    userId: returnedById,
    userName,
    action: "VEHICLE_RETURNED",
    module: "transport",
    resource: "vehicle_assignment",
    recordId: id,
    oldValue: { status: "ACTIVE" },
    newValue: { status: "RETURNED", returnedAt: new Date().toISOString() },
    description: `Vehicle ${assignment.vehicle.plateNumber} returned by driver ${assignment.driver.employee.fullName}`,
    ipAddress,
    companyId: assignment.vehicle.companyId,
  });

  return db.vehicleAssignment.findUnique({ where: { id } });
}
