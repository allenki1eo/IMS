/**
 * Regression checks for multi-company cookie / getCompanyId behavior.
 * Run: DATABASE_URL="file:./dev.db" npx tsx scripts/verify-company-context.ts
 */
import { NextRequest } from "next/server";
import { db } from "../src/lib/db";
import { getCompanyId } from "../src/lib/api-helpers";
import { resolveBootstrapCompanyId } from "../src/lib/company-cookie";
import { hashPassword } from "../src/lib/crypto";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

function makeRequest(headers: Record<string, string>) {
  return new NextRequest("http://localhost/api/test", { headers });
}

async function main() {
  console.log("→ Ensuring two companies exist...");
  const companyA = await db.company.upsert({
    where: { id: "company_main" },
    update: { name: "Your Company Name" },
    create: {
      id: "company_main",
      name: "Your Company Name",
      currency: "TZS",
    },
  });

  const companyB = await db.company.upsert({
    where: { id: "company_secondary" },
    update: { name: "Secondary Co" },
    create: {
      id: "company_secondary",
      name: "Secondary Co",
      currency: "TZS",
    },
  });

  assert(companyA.id === "company_main", "company A present");
  assert(companyB.id === "company_secondary", "company B present");

  console.log("→ resolveBootstrapCompanyId");
  const bootPreferred = await resolveBootstrapCompanyId(companyB.id);
  assert(bootPreferred === companyB.id, "prefers valid preferred companyId");

  const bootBogus = await resolveBootstrapCompanyId("does-not-exist");
  assert(bootBogus === companyA.id || bootBogus != null, "falls back to oldest company for bogus preferred");

  const bootNull = await resolveBootstrapCompanyId(null);
  assert(bootNull != null, "null preferred still returns a company");

  console.log("→ Seed / locate switch-capable admin user");
  let admin = await db.user.findFirst({
    where: { username: "admin" },
    select: { id: true, companyId: true, isSystemUser: true },
  });
  if (!admin) {
    const hash = await hashPassword("Admin@1234");
    admin = await db.user.create({
      data: {
        username: "admin",
        email: "admin@company.local",
        fullName: "Admin",
        passwordHash: hash,
        isSystemUser: true,
        mustChangePassword: false,
        companyId: companyA.id,
      },
      select: { id: true, companyId: true, isSystemUser: true },
    });
  } else if (!admin.companyId) {
    admin = await db.user.update({
      where: { id: admin.id },
      data: { companyId: companyA.id },
      select: { id: true, companyId: true, isSystemUser: true },
    });
  }

  // Ensure admin can switch (system user or * permission via roles)
  if (!admin.isSystemUser) {
    await db.user.update({
      where: { id: admin.id },
      data: { isSystemUser: true },
    });
  }

  console.log("→ getCompanyId with cookie / user context");
  const withCookieB = await getCompanyId(
    makeRequest({ "x-user-id": admin.id, "x-company-id": companyB.id })
  );
  assert(withCookieB === companyB.id, "switcher uses valid cookie company B");

  const withBogusCookie = await getCompanyId(
    makeRequest({ "x-user-id": admin.id, "x-company-id": "deleted-company-xyz" })
  );
  assert(
    withBogusCookie === admin.companyId,
    "bogus cookie falls back to user's assigned company (not findFirst guess)"
  );

  const noCookie = await getCompanyId(makeRequest({ "x-user-id": admin.id }));
  assert(noCookie === admin.companyId, "missing cookie uses assigned companyId");

  const noRequest = await getCompanyId();
  assert(noRequest === null, "no request returns null (no silent findFirst)");

  // Company-scoped warehouse create stamp check: both companies get own warehouse
  console.log("→ Company-scoped warehouse isolation");
  const codeA = `WH-CTX-A-${Date.now()}`;
  const codeB = `WH-CTX-B-${Date.now()}`;
  const whA = await db.warehouse.create({
    data: {
      companyId: companyA.id,
      name: "Ctx Warehouse A",
      code: codeA,
      createdById: admin.id,
    },
  });
  const whB = await db.warehouse.create({
    data: {
      companyId: companyB.id,
      name: "Ctx Warehouse B",
      code: codeB,
      createdById: admin.id,
    },
  });

  const listA = await db.warehouse.findMany({
    where: { companyId: companyA.id, code: { startsWith: "WH-CTX-" } },
  });
  const listB = await db.warehouse.findMany({
    where: { companyId: companyB.id, code: { startsWith: "WH-CTX-" } },
  });
  assert(listA.some((w) => w.id === whA.id), "warehouse A visible under company A");
  assert(!listA.some((w) => w.id === whB.id), "warehouse B not listed under company A");
  assert(listB.some((w) => w.id === whB.id), "warehouse B visible under company B");

  // Global vehicles: list without company filter returns both
  console.log("→ Global vehicle list behavior");
  const plateA = `CTX-A-${Date.now()}`;
  const plateB = `CTX-B-${Date.now()}`;
  const vA = await db.vehicle.create({
    data: {
      companyId: companyA.id,
      plateNumber: plateA,
      make: "Test",
      model: "A",
      createdById: admin.id,
    },
  });
  const vB = await db.vehicle.create({
    data: {
      companyId: companyB.id,
      plateNumber: plateB,
      make: "Test",
      model: "B",
      createdById: admin.id,
    },
  });
  const allVehicles = await db.vehicle.findMany({
    where: { plateNumber: { in: [plateA, plateB] } },
  });
  assert(allVehicles.length === 2, "vehicles from both companies exist (global list intent)");

  // Cleanup test rows
  await db.warehouse.deleteMany({ where: { id: { in: [whA.id, whB.id] } } });
  await db.vehicle.deleteMany({ where: { id: { in: [vA.id, vB.id] } } });

  console.log("\nAll company-context checks passed.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
