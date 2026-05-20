import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "transport:trip:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const reportDate = dateParam ? new Date(dateParam) : new Date();

  // Set date range: start of day to now
  const dayStart = new Date(reportDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(reportDate);
  dayEnd.setHours(23, 59, 59, 999);

  try {
    // Fetch company info for header
    const company = await db.company.findFirst({ where: { id: companyId } });

    // Fetch all TRUCK vehicles for this company
    const vehicles = await db.vehicle.findMany({
      where: { companyId, vehicleType: "TRUCK", isActive: true },
      orderBy: { plateNumber: "asc" },
      select: {
        id: true,
        plateNumber: true,
        currentLocation: true,
      },
    });

    const vehicleIds = vehicles.map((v) => v.id);

    // For each truck, find their active/recent trip
    // Active = PLANNED or DISPATCHED, or trips that started before reportDate and haven't ended
    const activeTrips = await db.tripOrder.findMany({
      where: {
        companyId,
        vehicleId: { in: vehicleIds },
        status: { in: ["PLANNED", "DISPATCHED", "IN_TRANSIT", "ACTIVE"] },
      },
      include: {
        vehicle: { select: { plateNumber: true } },
        trailer: { select: { plateNumber: true } },
        driver: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            licenseNumber: true,
            employee: { select: { fullName: true } },
          },
        },
        cargo: { select: { description: true, quantity: true, uom: true } },
        logs: {
          orderBy: { eventTime: "desc" },
          take: 1,
          select: { location: true },
        },
      },
    });

    // Build a map: vehicleId → trip
    const tripByVehicle = new Map(activeTrips.map((t) => [t.vehicleId, t]));

    const rows = vehicles.map((vehicle, idx) => {
      const trip = tripByVehicle.get(vehicle.id);
      const driver = trip?.driver ?? null;
      const driverName = driver?.employee?.fullName ??
        [driver?.firstName, driver?.lastName].filter(Boolean).join(" ") ?? null;

      const goods = trip?.cargo?.map((c) => c.description).join(", ") ||
        trip?.cargoDescription || null;

      const todayLocation =
        trip?.currentLocation ||
        trip?.logs?.[0]?.location ||
        vehicle.currentLocation ||
        null;

      return {
        no: idx + 1,
        vehicleId: vehicle.id,
        truck: vehicle.plateNumber,
        trailer: trip?.trailer?.plateNumber ?? null,
        driver: driverName,
        phone: driver?.phone ?? null,
        licence: driver?.licenseNumber ?? null,
        startTrip: trip?.actualDeparture ?? trip?.scheduledDeparture ?? null,
        from: trip?.origin ?? null,
        to: trip?.destination ?? null,
        goods,
        today: todayLocation,
        remark: trip?.notes ?? null,
        tripId: trip?.id ?? null,
        tripStatus: trip?.status ?? null,
      };
    });

    return success({ company, rows, reportDate: reportDate.toISOString() });
  } catch (err) {
    return handleError(err);
  }
}
