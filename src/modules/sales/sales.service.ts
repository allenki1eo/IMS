import { db } from "@/lib/db";

// ── Customers ──────────────────────────────────────────────────

export async function listCustomers(
  companyId: string,
  params: { search?: string; status?: string; page?: number; pageSize?: number } = {}
) {
  const { search, status, page = 1, pageSize = 20 } = params;
  const where: Record<string, unknown> = {
    companyId,
    ...(status && status !== "ALL" ? { status } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search } },
        { code: { contains: search } },
        { email: { contains: search } },
        { contactPerson: { contains: search } },
      ],
    } : {}),
  };
  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { orders: true } } },
    }),
    db.customer.count({ where }),
  ]);
  return { customers, total };
}

export async function getCustomerById(id: string) {
  return db.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { lines: true },
      },
      _count: { select: { orders: true } },
    },
  });
}

export async function upsertCustomer(
  companyId: string,
  data: {
    externalId?: string;
    code: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    contactPerson?: string | null;
    creditLimit?: number | null;
    currency?: string;
    status?: string;
    notes?: string | null;
  }
) {
  const orConditions: Array<Record<string, unknown>> = [{ code: data.code }];
  if (data.externalId) {
    orConditions.push({ externalId: data.externalId });
  }
  const existing = await db.customer.findFirst({
    where: { companyId, OR: orConditions },
  });

  if (existing) {
    return db.customer.update({
      where: { id: existing.id },
      data: { ...data, syncedAt: new Date() },
    });
  }

  return db.customer.create({
    data: { companyId, ...data, syncedAt: new Date() },
  });
}

// ── Sales Orders ───────────────────────────────────────────────

export async function listSalesOrders(
  companyId: string,
  params: {
    search?: string;
    status?: string;
    customerId?: string;
    page?: number;
    pageSize?: number;
    dateFrom?: string;
    dateTo?: string;
  } = {}
) {
  const { search, status, customerId, page = 1, pageSize = 20, dateFrom, dateTo } = params;
  const where: Record<string, unknown> = {
    companyId,
    ...(status && status !== "ALL" ? { status } : {}),
    ...(customerId ? { customerId } : {}),
    ...(search ? {
      OR: [
        { reference: { contains: search } },
        { customer: { name: { contains: search } } },
      ],
    } : {}),
    ...(dateFrom || dateTo ? {
      orderDate: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
      },
    } : {}),
  };

  const [orders, total] = await Promise.all([
    db.salesOrder.findMany({
      where,
      orderBy: { orderDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, name: true, code: true } },
        _count: { select: { lines: true } },
      },
    }),
    db.salesOrder.count({ where }),
  ]);
  return { orders, total };
}

export async function getSalesOrderById(id: string) {
  return db.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      lines: { orderBy: { productCode: "asc" } },
    },
  });
}

export async function upsertSalesOrder(
  companyId: string,
  data: {
    externalId?: string;
    reference: string;
    customerId: string;
    status?: string;
    priority?: string;
    orderDate?: Date;
    requiredDate?: Date | null;
    subtotal?: number;
    taxAmount?: number;
    totalAmount?: number;
    currency?: string;
    notes?: string | null;
    lines?: Array<{
      externalId?: string;
      productCode: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      totalPrice: number;
    }>;
  }
) {
  const { lines, ...orderData } = data;
  const orConditions: Array<Record<string, unknown>> = [{ reference: orderData.reference }];
  if (orderData.externalId) {
    orConditions.push({ externalId: orderData.externalId });
  }
  const existing = await db.salesOrder.findFirst({
    where: { companyId, OR: orConditions },
  });

  if (existing) {
    const updated = await db.salesOrder.update({
      where: { id: existing.id },
      data: { ...orderData, syncedAt: new Date() },
    });
    if (lines) {
      await db.salesOrderLine.deleteMany({ where: { orderId: existing.id } });
      await db.salesOrderLine.createMany({
        data: lines.map((l) => ({ orderId: existing.id, ...l })),
      });
    }
    return updated;
  }

  const order = await db.salesOrder.create({
    data: { companyId, ...orderData, syncedAt: new Date() },
  });

  if (lines) {
    await db.salesOrderLine.createMany({
      data: lines.map((l) => ({ orderId: order.id, ...l })),
    });
  }

  return order;
}

export async function updateSalesOrderStatus(
  id: string,
  status: string,
  dispatchRef?: string
) {
  return db.salesOrder.update({
    where: { id },
    data: { status, ...(dispatchRef ? { dispatchRef } : {}), syncedAt: new Date() },
  });
}

// ── KPIs ───────────────────────────────────────────────────────

export async function listKPIs(companyId: string, period?: string) {
  return db.salesKPI.findMany({
    where: { companyId, ...(period ? { period } : {}) },
    orderBy: [{ period: "desc" }, { metric: "asc" }],
  });
}

export async function upsertKPI(
  companyId: string,
  data: { period: string; metric: string; target?: number; achieved?: number; currency?: string }
) {
  const { period, metric, ...rest } = data;
  return db.salesKPI.upsert({
    where: { companyId_period_metric: { companyId, period, metric } },
    update: { ...rest, syncedAt: new Date() },
    create: { companyId, period, metric, ...rest, syncedAt: new Date() },
  });
}

// ── Analytics ──────────────────────────────────────────────────

export async function getSalesSummary(companyId: string) {
  const now = new Date();

  const [
    totalCustomers,
    totalOrders,
    pendingOrders,
    thisMonthOrders,
    lastMonthOrders,
    kpisThisMonth,
    recentOrders,
  ] = await Promise.all([
    db.customer.count({ where: { companyId, status: "ACTIVE" } }),
    db.salesOrder.count({ where: { companyId } }),
    db.salesOrder.count({ where: { companyId, status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } } }),
    db.salesOrder.aggregate({
      where: { companyId, orderDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    db.salesOrder.aggregate({
      where: {
        companyId,
        orderDate: {
          gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          lt: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    db.salesKPI.findMany({
      where: {
        companyId,
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      },
    }),
    db.salesOrder.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  return {
    totalCustomers,
    totalOrders,
    pendingOrders,
    thisMonth: { revenue: thisMonthOrders._sum.totalAmount ?? 0, orders: thisMonthOrders._count },
    lastMonth: { revenue: lastMonthOrders._sum.totalAmount ?? 0, orders: lastMonthOrders._count },
    kpis: kpisThisMonth,
    recentOrders,
  };
}
