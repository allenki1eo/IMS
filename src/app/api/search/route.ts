import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";

export interface SearchResult {
  group: string;
  label: string;
  sublabel: string;
  href: string;
}

const LIMIT = 5;

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "auth:session:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return badRequest("Query must be at least 2 characters");

  // SQLite/libSQL: LIKE is case-insensitive for ASCII, no `mode` support
  const contains = { contains: q };

  try {
    const [
      items,
      vehicles,
      suppliers,
      employees,
      purchaseOrders,
      payments,
      batches,
      dispatchOrders,
      workOrders,
    ] = await Promise.all([
      db.item.findMany({
        where: { companyId, OR: [{ name: contains }, { code: contains }] },
        select: { id: true, name: true, code: true },
        take: LIMIT,
      }),
      db.vehicle.findMany({
        where: { companyId, OR: [{ plateNumber: contains }, { make: contains }, { model: contains }] },
        select: { id: true, plateNumber: true, make: true, model: true },
        take: LIMIT,
      }),
      db.supplier.findMany({
        where: { companyId, OR: [{ name: contains }, { code: contains }] },
        select: { id: true, name: true, code: true },
        take: LIMIT,
      }),
      db.employee.findMany({
        where: { companyId, OR: [{ fullName: contains }, { employeeNumber: contains }] },
        select: { id: true, fullName: true, employeeNumber: true, position: true },
        take: LIMIT,
      }),
      db.purchaseOrder.findMany({
        where: { companyId, reference: contains },
        select: { id: true, reference: true, status: true, supplier: { select: { name: true } } },
        take: LIMIT,
      }),
      db.payment.findMany({
        where: { companyId, OR: [{ paymentNumber: contains }, { partyName: contains }] },
        select: { id: true, paymentNumber: true, partyName: true, status: true },
        take: LIMIT,
      }),
      db.productionBatch.findMany({
        where: { companyId, OR: [{ reference: contains }, { productName: contains }] },
        select: { id: true, reference: true, productName: true, status: true },
        take: LIMIT,
      }),
      db.dispatchOrder.findMany({
        where: { companyId, OR: [{ reference: contains }, { customerName: contains }] },
        select: { id: true, reference: true, customerName: true, status: true },
        take: LIMIT,
      }),
      db.workOrder.findMany({
        where: { companyId, OR: [{ reference: contains }, { description: contains }] },
        select: { id: true, reference: true, description: true, status: true },
        take: LIMIT,
      }),
    ]);

    const results: SearchResult[] = [
      ...items.map((r) => ({
        group: "Items",
        label: r.name,
        sublabel: r.code,
        href: `/warehouse/items/${r.id}`,
      })),
      ...vehicles.map((r) => ({
        group: "Vehicles",
        label: r.plateNumber,
        sublabel: `${r.make} ${r.model}`,
        href: `/transport/vehicles/${r.id}`,
      })),
      ...suppliers.map((r) => ({
        group: "Suppliers",
        label: r.name,
        sublabel: r.code,
        href: `/procurement/suppliers/${r.id}`,
      })),
      ...employees.map((r) => ({
        group: "Employees",
        label: r.fullName,
        sublabel: r.position || r.employeeNumber,
        href: `/employees/${r.id}`,
      })),
      ...purchaseOrders.map((r) => ({
        group: "Purchase Orders",
        label: r.reference,
        sublabel: `${r.supplier.name} · ${r.status}`,
        href: `/procurement/orders/${r.id}`,
      })),
      ...payments.map((r) => ({
        group: "Payments",
        label: r.paymentNumber,
        sublabel: `${r.partyName} · ${r.status}`,
        href: `/finance/payments/${r.id}`,
      })),
      ...batches.map((r) => ({
        group: "Production Batches",
        label: r.reference,
        sublabel: `${r.productName} · ${r.status}`,
        href: `/production/batches/${r.id}`,
      })),
      ...dispatchOrders.map((r) => ({
        group: "Dispatch Orders",
        label: r.reference,
        sublabel: `${r.customerName} · ${r.status}`,
        href: `/dispatch/orders/${r.id}`,
      })),
      ...workOrders.map((r) => ({
        group: "Work Orders",
        label: r.reference,
        sublabel: `${r.description.slice(0, 60)} · ${r.status}`,
        href: `/maintenance/work-orders/${r.id}`,
      })),
    ];

    return success(results);
  } catch (err) {
    console.error("[Global search]", err);
    return handleError(err);
  }
}
