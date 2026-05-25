/**
 * Production migration script for Turso (libSQL).
 *
 * Run once after deploying schema changes:
 *   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." npx tsx scripts/migrate-prod.ts
 *
 * Safe to run multiple times — every statement is wrapped in IF NOT EXISTS
 * or catches the "duplicate column" error silently.
 */
import { createClient } from "@libsql/client";

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = createClient({
  url: DATABASE_URL,
  authToken: DATABASE_AUTH_TOKEN,
});

type Migration = { description: string; sql: string };

const migrations: Migration[] = [
  // ── Warehouse ──────────────────────────────────────────────────────────────
  {
    description: "Add warehouseType column to warehouses",
    sql: `ALTER TABLE warehouses ADD COLUMN warehouseType TEXT NOT NULL DEFAULT 'MAIN'`,
  },

  // ── Sales module (new tables) ──────────────────────────────────────────────
  {
    description: "Create customers table",
    sql: `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      creditLimit REAL,
      paymentTerms INTEGER,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      createdById TEXT NOT NULL
    )`,
  },
  {
    description: "Create sales_orders table",
    sql: `CREATE TABLE IF NOT EXISTS sales_orders (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      customerId TEXT NOT NULL,
      orderNumber TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      orderDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deliveryDate DATETIME,
      totalAmount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      createdById TEXT NOT NULL
    )`,
  },
  {
    description: "Create sales_kpis table",
    sql: `CREATE TABLE IF NOT EXISTS sales_kpis (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      period TEXT NOT NULL,
      totalRevenue REAL NOT NULL DEFAULT 0,
      totalOrders INTEGER NOT NULL DEFAULT 0,
      newCustomers INTEGER NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL
    )`,
  },

  // ── Daily truck movement (new table) ───────────────────────────────────────
  {
    description: "Create daily_truck_movements table",
    sql: `CREATE TABLE IF NOT EXISTS daily_truck_movements (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      vehicleId TEXT NOT NULL,
      driverId TEXT,
      movementDate DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      startOdometer REAL,
      endOdometer REAL,
      fuelIssued REAL,
      notes TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      createdById TEXT NOT NULL,
      submittedById TEXT,
      submittedAt DATETIME
    )`,
  },

  // ── Vehicle additions ──────────────────────────────────────────────────────
  {
    description: "Add usageType column to vehicles",
    sql: `ALTER TABLE vehicles ADD COLUMN usageType TEXT NOT NULL DEFAULT 'COMMERCIAL'`,
  },
  {
    description: "Add fuelTankCapacity column to vehicles",
    sql: `ALTER TABLE vehicles ADD COLUMN fuelTankCapacity REAL`,
  },
  {
    description: "Add averageConsumption column to vehicles",
    sql: `ALTER TABLE vehicles ADD COLUMN averageConsumption REAL`,
  },
  {
    description: "Add lastRefuelAt column to vehicles",
    sql: `ALTER TABLE vehicles ADD COLUMN lastRefuelAt DATETIME`,
  },
  {
    description: "Add nextRefuelAt column to vehicles",
    sql: `ALTER TABLE vehicles ADD COLUMN nextRefuelAt DATETIME`,
  },

  // ── Finance additions ──────────────────────────────────────────────────────
  {
    description: "Add currency columns to journal_entries if missing",
    sql: `ALTER TABLE journal_entries ADD COLUMN currency TEXT NOT NULL DEFAULT 'TZS'`,
  },
  {
    description: "Add exchangeRate column to journal_entry_lines if missing",
    sql: `ALTER TABLE journal_entry_lines ADD COLUMN exchangeRate REAL NOT NULL DEFAULT 1`,
  },
];

async function run() {
  console.log(`Connecting to: ${DATABASE_URL?.slice(0, 40)}...`);
  let passed = 0;
  let skipped = 0;

  for (const m of migrations) {
    try {
      await client.execute(m.sql);
      console.log(`  ✔  ${m.description}`);
      passed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // "duplicate column" or "already exists" means the migration was already applied
      if (/duplicate column|already exists/i.test(msg)) {
        console.log(`  –  ${m.description} (already applied)`);
        skipped++;
      } else {
        console.error(`  ✖  ${m.description}`);
        console.error(`     ${msg}`);
      }
    }
  }

  console.log(`\nDone — ${passed} applied, ${skipped} already present.`);
  process.exit(0);
}

run();
