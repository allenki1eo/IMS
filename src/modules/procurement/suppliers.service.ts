import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listSuppliers(
  companyId: string,
  params: {
    search?: string;
    status?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, status, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    db.supplier.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: "asc" },
      include: { _count: { select: { purchaseOrders: true } } },
    }),
    db.supplier.count({ where }),
  ]);

  return { data, meta: { total, page, pageSize } };
}

export async function getSupplier(companyId: string, id: string) {
  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      purchaseOrders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { _count: { select: { lines: true } } },
      },
    },
  });
  if (!supplier) return null;
  if (supplier.companyId !== companyId) return null;
  return supplier;
}

export async function createSupplier(
  companyId: string,
  data: {
    code: string;
    name: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    taxNumber?: string | null;
    paymentTerms?: string | null;
  },
  createdById: string,
  userName: string,
  ipAddress?: string
) {
  const supplier = await db.supplier.create({
    data: {
      companyId,
      code: data.code,
      name: data.name,
      contactPerson: data.contactPerson ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      taxNumber: data.taxNumber ?? null,
      paymentTerms: data.paymentTerms ?? null,
      createdById,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "SUPPLIER_CREATE",
    module: "procurement",
    resource: "supplier",
    recordId: supplier.id,
    newValue: { code: data.code, name: data.name },
    description: `Created supplier: ${data.name} (${data.code})`,
    ipAddress,
    companyId,
  });

  return supplier;
}

export async function updateSupplier(
  companyId: string,
  id: string,
  data: {
    code?: string;
    name?: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    taxNumber?: string | null;
    paymentTerms?: string | null;
    status?: string;
  },
  updatedById: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.supplier.findUnique({ where: { id } });
  if (!existing) throw new Error("Supplier not found");
  if (existing.companyId !== companyId) throw new Error("Supplier not found");

  const updateData: Record<string, unknown> = {};
  for (const key of [
    "code",
    "name",
    "contactPerson",
    "email",
    "phone",
    "address",
    "taxNumber",
    "paymentTerms",
    "status",
  ] as const) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  const updated = await db.supplier.update({ where: { id }, data: updateData });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "SUPPLIER_UPDATE",
    module: "procurement",
    resource: "supplier",
    recordId: id,
    oldValue: { code: existing.code, name: existing.name, status: existing.status },
    newValue: updateData,
    description: `Updated supplier: ${existing.name}`,
    ipAddress,
    companyId,
  });

  return updated;
}

