import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listDrivers(
  params: {
    search?: string;
    status?: string;
    isAvailable?: boolean;
    page: number;
    pageSize: number;
  }
) {
  const { search, status, isAvailable, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(status ? { status } : {}),
    ...(isAvailable !== undefined ? { isAvailable } : {}),
    ...(search
      ? {
          OR: [
            { licenseNumber: { contains: search } },
            { employee: { fullName: { contains: search } } },
            { employee: { employeeNumber: { contains: search } } },
            { employee: { phone: { contains: search } } },
          ],
        }
      : {}),
  };

  const [drivers, total] = await Promise.all([
    db.driver.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            phone: true,
          },
        },
        _count: {
          select: { trips: true },
        },
      },
    }),
    db.driver.count({ where }),
  ]);

  return { data: drivers, meta: { total, page, pageSize } };
}

export async function getDriverById(id: string) {
  return db.driver.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          employeeNumber: true,
          email: true,
          phone: true,
          position: true,
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
      },
      assignments: {
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
        },
      },
      trips: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          reference: true,
          origin: true,
          destination: true,
          status: true,
          scheduledDeparture: true,
          actualDeparture: true,
          actualArrival: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function createDriver(params: {
  companyId: string;
  employeeId: string;
  licenseNumber?: string | null;
  licenseClass?: string | null;
  licenseExpiry?: Date | null;
  medicalExpiry?: Date | null;
  notes?: string | null;
  createdById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { createdById, userName, ipAddress, ...data } = params;

  const employee = await db.employee.findUnique({ where: { id: data.employeeId } });
  if (!employee) throw new Error("Employee not found");
  if (!employee.isDriver) throw new Error("Employee is not marked as a driver");

  const existing = await db.driver.findUnique({ where: { employeeId: data.employeeId } });
  if (existing) throw new Error("Driver record already exists for this employee");

  const driver = await db.driver.create({
    data: {
      companyId: data.companyId,
      employeeId: data.employeeId,
      licenseNumber: data.licenseNumber ?? null,
      licenseClass: data.licenseClass ?? null,
      licenseExpiry: data.licenseExpiry ?? null,
      medicalExpiry: data.medicalExpiry ?? null,
      notes: data.notes ?? null,
      createdById,
    },
    include: {
      employee: {
        select: { id: true, fullName: true, employeeNumber: true },
      },
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "DRIVER_CREATE",
    module: "transport",
    resource: "driver",
    recordId: driver.id,
    newValue: {
      employeeId: data.employeeId,
      licenseNumber: data.licenseNumber ?? undefined,
      licenseClass: data.licenseClass ?? undefined,
    },
    description: `Created driver record for employee: ${employee.fullName}`,
    ipAddress,
    companyId: data.companyId,
  });

  return driver;
}

export async function updateDriver(params: {
  id: string;
  data: {
    licenseNumber?: string | null;
    licenseClass?: string | null;
    licenseExpiry?: Date | null;
    medicalExpiry?: Date | null;
    status?: string;
    notes?: string | null;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, data, updatedById, userName, ipAddress } = params;

  const existing = await db.driver.findUnique({
    where: { id },
    include: { employee: { select: { fullName: true } } },
  });
  if (!existing) throw new Error("Driver not found");

  const updated = await db.driver.update({ where: { id }, data });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "DRIVER_UPDATE",
    module: "transport",
    resource: "driver",
    recordId: id,
    oldValue: { licenseNumber: existing.licenseNumber, licenseClass: existing.licenseClass },
    newValue: data as Record<string, unknown>,
    description: `Updated driver record for: ${existing.employee.fullName}`,
    ipAddress,
    companyId: existing.companyId,
  });

  return updated;
}

export async function setDriverAvailability(params: {
  id: string;
  isAvailable: boolean;
  updatedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, isAvailable, updatedById, userName, ipAddress } = params;

  const existing = await db.driver.findUnique({
    where: { id },
    include: { employee: { select: { fullName: true } } },
  });
  if (!existing) throw new Error("Driver not found");

  const updated = await db.driver.update({ where: { id }, data: { isAvailable } });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "DRIVER_AVAILABILITY_CHANGE",
    module: "transport",
    resource: "driver",
    recordId: id,
    oldValue: { isAvailable: existing.isAvailable },
    newValue: { isAvailable },
    description: `Set driver ${existing.employee.fullName} availability to ${isAvailable ? "available" : "unavailable"}`,
    ipAddress,
    companyId: existing.companyId,
  });

  return updated;
}
