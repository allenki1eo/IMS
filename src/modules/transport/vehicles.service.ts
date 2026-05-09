import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function generateRef(prefix: string): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export async function listVehicles(
  companyId: string,
  params: {
    search?: string;
    branchId?: string;
    status?: string;
    vehicleType?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, branchId, status, vehicleType, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(branchId ? { branchId } : {}),
    ...(status ? { status } : {}),
    ...(vehicleType ? { vehicleType } : {}),
    ...(search
      ? {
          OR: [
            { plateNumber: { contains: search } },
            { make: { contains: search } },
            { model: { contains: search } },
            { chassisNumber: { contains: search } },
          ],
        }
      : {}),
  };

  const [vehicles, total] = await Promise.all([
    db.vehicle.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { trips: true, incidents: true },
        },
      },
    }),
    db.vehicle.count({ where }),
  ]);

  return { data: vehicles, meta: { total, page, pageSize } };
}

export async function getVehicleById(id: string) {
  return db.vehicle.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
      },
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: {
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
      incidents: {
        where: { status: "OPEN" },
        orderBy: { incidentDate: "desc" },
      },
    },
  });
}

export async function createVehicle(params: {
  companyId: string;
  branchId?: string | null;
  plateNumber: string;
  make: string;
  model: string;
  year?: number | null;
  vehicleType?: string;
  capacity?: number | null;
  fuelType?: string;
  color?: string | null;
  chassisNumber?: string | null;
  engineNumber?: string | null;
  odometer?: number;
  insuranceExpiry?: Date | null;
  roadWorthyExpiry?: Date | null;
  notes?: string | null;
  createdById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { createdById, userName, ipAddress, ...data } = params;

  const vehicle = await db.vehicle.create({
    data: {
      companyId: data.companyId,
      branchId: data.branchId ?? null,
      plateNumber: data.plateNumber,
      make: data.make,
      model: data.model,
      year: data.year ?? null,
      vehicleType: data.vehicleType ?? "TRUCK",
      capacity: data.capacity ?? null,
      fuelType: data.fuelType ?? "DIESEL",
      color: data.color ?? null,
      chassisNumber: data.chassisNumber ?? null,
      engineNumber: data.engineNumber ?? null,
      odometer: data.odometer ?? 0,
      insuranceExpiry: data.insuranceExpiry ?? null,
      roadWorthyExpiry: data.roadWorthyExpiry ?? null,
      notes: data.notes ?? null,
      createdById,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "VEHICLE_CREATE",
    module: "transport",
    resource: "vehicle",
    recordId: vehicle.id,
    newValue: {
      plateNumber: data.plateNumber,
      make: data.make,
      model: data.model,
      vehicleType: data.vehicleType ?? "TRUCK",
    },
    description: `Created vehicle: ${data.plateNumber} (${data.make} ${data.model})`,
    ipAddress,
    companyId: data.companyId,
  });

  return vehicle;
}

export async function updateVehicle(params: {
  id: string;
  data: {
    branchId?: string | null;
    plateNumber?: string;
    make?: string;
    model?: string;
    year?: number | null;
    vehicleType?: string;
    capacity?: number | null;
    fuelType?: string;
    color?: string | null;
    chassisNumber?: string | null;
    engineNumber?: string | null;
    insuranceExpiry?: Date | null;
    roadWorthyExpiry?: Date | null;
    lastServiceDate?: Date | null;
    nextServiceDate?: Date | null;
    notes?: string | null;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, data, updatedById, userName, ipAddress } = params;

  const existing = await db.vehicle.findUnique({ where: { id } });
  if (!existing) throw new Error("Vehicle not found");

  const updated = await db.vehicle.update({ where: { id }, data });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "VEHICLE_UPDATE",
    module: "transport",
    resource: "vehicle",
    recordId: id,
    oldValue: { plateNumber: existing.plateNumber, make: existing.make, model: existing.model },
    newValue: data as Record<string, unknown>,
    description: `Updated vehicle: ${existing.plateNumber}`,
    ipAddress,
    companyId: existing.companyId,
  });

  return updated;
}

export async function setVehicleStatus(params: {
  id: string;
  status: string;
  updatedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, status, updatedById, userName, ipAddress } = params;

  const existing = await db.vehicle.findUnique({ where: { id } });
  if (!existing) throw new Error("Vehicle not found");

  const updated = await db.vehicle.update({ where: { id }, data: { status } });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "VEHICLE_STATUS_CHANGE",
    module: "transport",
    resource: "vehicle",
    recordId: id,
    oldValue: { status: existing.status },
    newValue: { status },
    description: `Changed vehicle ${existing.plateNumber} status from ${existing.status} to ${status}`,
    ipAddress,
    companyId: existing.companyId,
  });

  return updated;
}

export async function addVehicleDocument(params: {
  vehicleId: string;
  documentType: string;
  documentNumber?: string | null;
  issuedAt?: Date | null;
  expiresAt?: Date | null;
  notes?: string | null;
  createdById: string;
}) {
  const { vehicleId, documentType, documentNumber, issuedAt, expiresAt, notes, createdById } =
    params;

  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new Error("Vehicle not found");

  return db.vehicleDocument.create({
    data: {
      vehicleId,
      documentType,
      documentNumber: documentNumber ?? null,
      issuedAt: issuedAt ?? null,
      expiresAt: expiresAt ?? null,
      notes: notes ?? null,
      createdById,
    },
  });
}

export async function updateOdometer(params: {
  id: string;
  odometer: number;
  updatedById: string;
  userName: string;
  ipAddress?: string;
}) {
  const { id, odometer, updatedById, userName, ipAddress } = params;

  const existing = await db.vehicle.findUnique({ where: { id } });
  if (!existing) throw new Error("Vehicle not found");

  const updated = await db.vehicle.update({ where: { id }, data: { odometer } });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "ODOMETER_UPDATE",
    module: "transport",
    resource: "vehicle",
    recordId: id,
    oldValue: { odometer: existing.odometer },
    newValue: { odometer },
    description: `Updated odometer for vehicle ${existing.plateNumber}: ${existing.odometer} → ${odometer}`,
    ipAddress,
    companyId: existing.companyId,
  });

  return updated;
}
