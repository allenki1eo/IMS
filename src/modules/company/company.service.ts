import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function getCompany() {
  return db.company.findFirst();
}

export async function getCompanyById(id: string) {
  return db.company.findUnique({ where: { id } });
}

export async function listCompanies() {
  return db.company.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createCompany(params: {
  data: {
    name: string;
    legalName?: string | null;
    registrationNumber?: string | null;
    taxNumber?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    currency?: string;
    dateFormat?: string;
    fiscalYearStart?: number;
  };
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { data, createdById, userName, ipAddress, userAgent } = params;

  const company = await db.company.create({
    data: {
      ...data,
      currency: data.currency ?? "USD",
      dateFormat: data.dateFormat ?? "YYYY-MM-DD",
      fiscalYearStart: data.fiscalYearStart ?? 1,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "COMPANY_CREATE",
    module: "company",
    resource: "company",
    recordId: company.id,
    newValue: data,
    description: "Created new company",
    ipAddress,
    userAgent,
    companyId: company.id,
  });

  return company;
}

export async function updateCompany(params: {
  id: string;
  data: {
    name?: string;
    legalName?: string | null;
    registrationNumber?: string | null;
    taxNumber?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    currency?: string;
    dateFormat?: string;
    fiscalYearStart?: number;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, data, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.company.findUnique({ where: { id } });
  if (!existing) throw new Error("Company not found");

  const updated = await db.company.update({ where: { id }, data });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "COMPANY_UPDATE",
    module: "company",
    resource: "company",
    recordId: id,
    oldValue: { name: existing.name, currency: existing.currency },
    newValue: data,
    description: "Updated company profile",
    ipAddress,
    userAgent,
    companyId: id,
  });

  return updated;
}
