-- ============================================================
-- IMS ERP — complete Turso setup (schema + seed data)
-- Generated 2026-08-21
-- Paste into: turso db shell <db>  or the Turso web SQL console
-- WARNING: drops and recreates ALL app tables (fresh install).
-- Logins after running:
--   admin      / Admin@1234       (forced password change)
--   superadmin / SuperAdmin@2026  (forced password change)
-- ============================================================
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "companies";
DROP TABLE IF EXISTS "branches";
DROP TABLE IF EXISTS "departments";
DROP TABLE IF EXISTS "users";
DROP TABLE IF EXISTS "roles";
DROP TABLE IF EXISTS "permissions";
DROP TABLE IF EXISTS "role_permissions";
DROP TABLE IF EXISTS "user_roles";
DROP TABLE IF EXISTS "sessions";
DROP TABLE IF EXISTS "employees";
DROP TABLE IF EXISTS "settings";
DROP TABLE IF EXISTS "audit_logs";
DROP TABLE IF EXISTS "approval_workflows";
DROP TABLE IF EXISTS "approval_workflow_steps";
DROP TABLE IF EXISTS "approval_requests";
DROP TABLE IF EXISTS "approval_actions";
DROP TABLE IF EXISTS "warehouses";
DROP TABLE IF EXISTS "storage_locations";
DROP TABLE IF EXISTS "item_categories";
DROP TABLE IF EXISTS "units_of_measure";
DROP TABLE IF EXISTS "items";
DROP TABLE IF EXISTS "stock_balances";
DROP TABLE IF EXISTS "stock_ledger";
DROP TABLE IF EXISTS "goods_received_notes";
DROP TABLE IF EXISTS "grn_lines";
DROP TABLE IF EXISTS "stock_transfers";
DROP TABLE IF EXISTS "stock_transfer_lines";
DROP TABLE IF EXISTS "stock_adjustments";
DROP TABLE IF EXISTS "stock_adjustment_lines";
DROP TABLE IF EXISTS "store_issues";
DROP TABLE IF EXISTS "store_issue_lines";
DROP TABLE IF EXISTS "vehicles";
DROP TABLE IF EXISTS "vehicle_documents";
DROP TABLE IF EXISTS "drivers";
DROP TABLE IF EXISTS "vehicle_assignments";
DROP TABLE IF EXISTS "trip_orders";
DROP TABLE IF EXISTS "trip_logs";
DROP TABLE IF EXISTS "trip_cargo";
DROP TABLE IF EXISTS "vehicle_incidents";
DROP TABLE IF EXISTS "fuel_tanks";
DROP TABLE IF EXISTS "fuel_receipts";
DROP TABLE IF EXISTS "fuel_issues";
DROP TABLE IF EXISTS "fuel_prices";
DROP TABLE IF EXISTS "maintenance_schedules";
DROP TABLE IF EXISTS "work_orders";
DROP TABLE IF EXISTS "work_order_items";
DROP TABLE IF EXISTS "spare_part_categories";
DROP TABLE IF EXISTS "spare_parts";
DROP TABLE IF EXISTS "spare_part_transactions";
DROP TABLE IF EXISTS "suppliers";
DROP TABLE IF EXISTS "purchase_requests";
DROP TABLE IF EXISTS "purchase_request_lines";
DROP TABLE IF EXISTS "purchase_orders";
DROP TABLE IF EXISTS "purchase_order_lines";
DROP TABLE IF EXISTS "production_lines";
DROP TABLE IF EXISTS "production_recipes";
DROP TABLE IF EXISTS "recipe_materials";
DROP TABLE IF EXISTS "production_batches";
DROP TABLE IF EXISTS "batch_materials";
DROP TABLE IF EXISTS "quality_standards";
DROP TABLE IF EXISTS "quality_standard_parameters";
DROP TABLE IF EXISTS "quality_tests";
DROP TABLE IF EXISTS "quality_test_results";
DROP TABLE IF EXISTS "non_conformances";
DROP TABLE IF EXISTS "fg_products";
DROP TABLE IF EXISTS "fg_lots";
DROP TABLE IF EXISTS "dispatch_orders";
DROP TABLE IF EXISTS "dispatch_order_lines";
DROP TABLE IF EXISTS "accounts";
DROP TABLE IF EXISTS "journal_entries";
DROP TABLE IF EXISTS "journal_entry_lines";
DROP TABLE IF EXISTS "bank_accounts";
DROP TABLE IF EXISTS "cashbook_entries";
DROP TABLE IF EXISTS "pv_sequences";
DROP TABLE IF EXISTS "bank_transactions";
DROP TABLE IF EXISTS "payments";
DROP TABLE IF EXISTS "payment_allocations";
DROP TABLE IF EXISTS "exchange_rates";
DROP TABLE IF EXISTS "customers";
DROP TABLE IF EXISTS "sales_orders";
DROP TABLE IF EXISTS "sales_order_lines";
DROP TABLE IF EXISTS "sales_kpis";
DROP TABLE IF EXISTS "sales_webhook_logs";
DROP TABLE IF EXISTS "daily_truck_movements";
DROP TABLE IF EXISTS "daily_truck_movement_entries";
DROP TABLE IF EXISTS "tra_stamp_batches";
DROP TABLE IF EXISTS "tra_stamp_activations";
DROP TABLE IF EXISTS "tally_sync_logs";
DROP TABLE IF EXISTS "tally_vouchers";
DROP TABLE IF EXISTS "tally_ledgers";
DROP TABLE IF EXISTS "tally_api_keys";
DROP TABLE IF EXISTS "cotton_seasons";
DROP TABLE IF EXISTS "cotton_bales";
DROP TABLE IF EXISTS "cotton_lots";
DROP TABLE IF EXISTS "cotton_buyers";
DROP TABLE IF EXISTS "cotton_contracts";
DROP TABLE IF EXISTS "cotton_contract_lines";
DROP TABLE IF EXISTS "cotton_invoices";
DROP TABLE IF EXISTS "brewing_sessions";
DROP TABLE IF EXISTS "brewing_activities";
DROP TABLE IF EXISTS "brew_material_usages";
DROP TABLE IF EXISTS "brew_material_items";
DROP TABLE IF EXISTS "cip_records";
DROP TABLE IF EXISTS "unitank_analyses";
DROP TABLE IF EXISTS "bbt_analyses";
DROP TABLE IF EXISTS "micro_reports";
DROP TABLE IF EXISTS "micro_report_samples";
DROP TABLE IF EXISTS "product_specs";
DROP TABLE IF EXISTS "product_spec_parameters";
CREATE TABLE "companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "registrationNumber" TEXT,
    "taxNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoPath" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "dateFormat" TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    "fiscalYearStart" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "branches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "managerId" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "branches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "headEmployeeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "departments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "departments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "departments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT,
    "companyId" TEXT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "avatarPath" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemUser" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "passwordChangedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "users_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT
);
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "module" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT
);
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedById" TEXT NOT NULL,

    PRIMARY KEY ("roleId", "permissionId"),
    CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "branchId" TEXT,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT NOT NULL,
    "expiresAt" DATETIME,
    CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_roles_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "departmentId" TEXT,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'PERMANENT',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "hireDate" DATETIME,
    "terminationDate" DATETIME,
    "isDriver" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "hrEmployeeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "employees_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT NOT NULL,
    CONSTRAINT "settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "branchId" TEXT,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "recordId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "approval_workflows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL
);
CREATE TABLE "approval_workflow_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "approverType" TEXT NOT NULL DEFAULT 'ANY_OF_ROLE',
    "approverRoleId" TEXT,
    "approverUserId" TEXT,
    "canDelegate" BOOLEAN NOT NULL DEFAULT false,
    "timeLimitHours" INTEGER,
    CONSTRAINT "approval_workflow_steps_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "approval_workflows" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "approval_workflow_steps_approverRoleId_fkey" FOREIGN KEY ("approverRoleId") REFERENCES "roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "recordReference" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "resolvedAt" DATETIME,
    "resolvedById" TEXT,
    CONSTRAINT "approval_requests_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "approval_workflows" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "approval_actions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actedById" TEXT NOT NULL,
    "actedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comments" TEXT,
    "nextApproverId" TEXT,
    CONSTRAINT "approval_actions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "approval_requests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "warehouseType" TEXT NOT NULL DEFAULT 'MAIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "warehouses_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "storage_locations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "warehouseId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "locationType" TEXT NOT NULL DEFAULT 'AREA',
    "capacity" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "storage_locations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "storage_locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "storage_locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "item_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "item_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "item_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "units_of_measure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "uomId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'RAW_MATERIAL',
    "minStock" REAL NOT NULL DEFAULT 0,
    "maxStock" REAL,
    "reorderPoint" REAL,
    "projectedWeeklyUsage" REAL,
    "leadTimeWeeks" REAL,
    "confirmationNote" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "item_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "items_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "units_of_measure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "stock_balances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "quantity" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stock_balances_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_balances_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_balances_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "storage_locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "stock_ledger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "transactionType" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "balanceAfter" REAL NOT NULL,
    "unitCost" REAL,
    "totalCost" REAL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_ledger_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_ledger_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "goods_received_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "supplierName" TEXT,
    "supplierRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "receivedById" TEXT NOT NULL,
    "receivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "goods_received_notes_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "grn_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grnId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT,
    "quantity" REAL NOT NULL,
    "unitCost" REAL,
    "totalCost" REAL,
    "notes" TEXT,
    CONSTRAINT "grn_lines_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "goods_received_notes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "grn_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "grn_lines_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "storage_locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "dispatchedAt" DATETIME,
    "receivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "stock_transfers_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_transfers_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "stock_transfer_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "quantity" REAL NOT NULL,
    CONSTRAINT "stock_transfer_lines_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "stock_transfers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_transfer_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_transfer_lines_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "storage_locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "stock_transfer_lines_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "storage_locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvalRequestId" TEXT,
    "submittedAt" DATETIME,
    "appliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "stock_adjustments_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "stock_adjustment_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adjustmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT,
    "systemQty" REAL NOT NULL,
    "countedQty" REAL NOT NULL,
    "difference" REAL NOT NULL,
    CONSTRAINT "stock_adjustment_lines_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "stock_adjustments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_adjustment_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_adjustment_lines_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "storage_locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "store_issues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "destination" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "store_issues_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "store_issue_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "notes" TEXT,
    CONSTRAINT "store_issue_lines_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "store_issues" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "store_issue_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "plateNumber" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "vehicleType" TEXT NOT NULL DEFAULT 'TRUCK',
    "usageType" TEXT NOT NULL DEFAULT 'COMMERCIAL',
    "capacity" REAL,
    "fuelType" TEXT NOT NULL DEFAULT 'DIESEL',
    "fuelTankCapacity" REAL,
    "color" TEXT,
    "chassisNumber" TEXT,
    "engineNumber" TEXT,
    "odometer" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "insuranceExpiry" DATETIME,
    "roadWorthyExpiry" DATETIME,
    "lastServiceDate" DATETIME,
    "nextServiceDate" DATETIME,
    "lastRefuelAt" DATETIME,
    "nextRefuelAt" DATETIME,
    "averageConsumption" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL
);
CREATE TABLE "vehicle_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT,
    "issuedAt" DATETIME,
    "expiresAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "vehicle_documents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "licenseNumber" TEXT,
    "licenseClass" TEXT,
    "licenseExpiry" DATETIME,
    "medicalExpiry" DATETIME,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "drivers_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "vehicle_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    CONSTRAINT "vehicle_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vehicle_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "trip_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "reference" TEXT NOT NULL,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "scheduledDeparture" DATETIME,
    "scheduledArrival" DATETIME,
    "actualDeparture" DATETIME,
    "actualArrival" DATETIME,
    "trailerId" TEXT,
    "cargoDescription" TEXT,
    "cargoWeight" REAL,
    "currentLocation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "approvalRequestId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "trip_orders_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "trip_orders_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "trip_orders_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "trip_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "odometer" REAL,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trip_logs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip_orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "trip_cargo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "itemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" REAL,
    "uom" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    CONSTRAINT "trip_cargo_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip_orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "vehicle_incidents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "tripId" TEXT,
    "incidentType" TEXT NOT NULL,
    "incidentDate" DATETIME NOT NULL,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolutionNotes" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vehicle_incidents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vehicle_incidents_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip_orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "fuel_tanks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL DEFAULT 'DIESEL',
    "capacity" REAL NOT NULL,
    "currentLevel" REAL NOT NULL DEFAULT 0,
    "minLevel" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL
);
CREATE TABLE "fuel_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "supplierName" TEXT,
    "deliveryNoteRef" TEXT,
    "quantityLiters" REAL NOT NULL,
    "pricePerLiter" REAL,
    "totalCost" REAL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "exchangeRate" REAL,
    "baseCurrencyAmount" REAL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "receivedById" TEXT NOT NULL,
    "receivedAt" DATETIME,
    "confirmedById" TEXT,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "fuel_receipts_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "fuel_tanks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "fuel_issues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "tripId" TEXT,
    "reference" TEXT NOT NULL,
    "quantityLiters" REAL NOT NULL,
    "pricePerLiter" REAL,
    "totalCost" REAL,
    "odometerReading" REAL,
    "issuedById" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "fuel_issues_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "fuel_tanks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fuel_issues_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fuel_issues_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "fuel_prices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL,
    "pricePerLiter" REAL NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "maintenance_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "description" TEXT,
    "intervalKm" REAL,
    "intervalDays" INTEGER,
    "lastDoneAt" DATETIME,
    "lastDoneOdometer" REAL,
    "nextDueAt" DATETIME,
    "nextDueOdometer" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "maintenance_schedules_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "reference" TEXT NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "requestedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "workshopName" TEXT,
    "estimatedCost" REAL,
    "actualCost" REAL,
    "odometerAtWork" REAL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "work_orders_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "work_orders_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "maintenance_schedules" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "work_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'LABOUR',
    "sparePartId" TEXT,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitCost" REAL,
    "totalCost" REAL,
    CONSTRAINT "work_order_items_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "work_order_items_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "spare_parts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "spare_part_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "spare_parts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "partNumber" TEXT,
    "uom" TEXT NOT NULL DEFAULT 'PCS',
    "currentStock" REAL NOT NULL DEFAULT 0,
    "minStock" REAL NOT NULL DEFAULT 0,
    "unitCost" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "spare_parts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "spare_part_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "spare_part_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unitCost" REAL,
    "totalCost" REAL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "spare_part_transactions_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "spare_parts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxNumber" TEXT,
    "paymentTerms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL
);
CREATE TABLE "purchase_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT,
    "reference" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "neededBy" DATETIME,
    "requestedById" TEXT NOT NULL,
    "submittedAt" DATETIME,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "rejectedReason" TEXT,
    "estimatedTotal" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL
);
CREATE TABLE "purchase_request_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "itemId" TEXT,
    "itemCode" TEXT,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'PCS',
    "estimatedUnitCost" REAL,
    "estimatedTotal" REAL,
    CONSTRAINT "purchase_request_lines_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "purchase_requests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "requestId" TEXT,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDelivery" DATETIME,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "exchangeRate" REAL,
    "baseCurrencyAmount" REAL,
    "notes" TEXT,
    "sentAt" DATETIME,
    "receivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "purchase_requests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "purchase_order_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
    "itemId" TEXT,
    "itemCode" TEXT,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'PCS',
    "unitCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "receivedQty" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "purchase_order_lines_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "production_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lineType" TEXT NOT NULL DEFAULT 'BREWING',
    "location" TEXT,
    "capacityPerDay" REAL,
    "uom" TEXT NOT NULL DEFAULT 'L',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL
);
CREATE TABLE "production_recipes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productItemId" TEXT,
    "productCode" TEXT,
    "productName" TEXT NOT NULL,
    "batchSize" REAL NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'L',
    "version" TEXT NOT NULL DEFAULT '1',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL
);
CREATE TABLE "recipe_materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "itemId" TEXT,
    "itemCode" TEXT,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'KG',
    "wastagePct" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "recipe_materials_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "production_recipes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "production_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "lineId" TEXT,
    "recipeId" TEXT,
    "reference" TEXT NOT NULL,
    "batchType" TEXT NOT NULL DEFAULT 'BREWING',
    "productItemId" TEXT,
    "productCode" TEXT,
    "productName" TEXT NOT NULL,
    "plannedQty" REAL NOT NULL,
    "actualQty" REAL,
    "uom" TEXT NOT NULL DEFAULT 'L',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "plannedStart" DATETIME,
    "plannedEnd" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "production_batches_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "production_lines" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "production_batches_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "production_recipes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "batch_materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "itemId" TEXT,
    "itemCode" TEXT,
    "description" TEXT NOT NULL,
    "plannedQty" REAL NOT NULL,
    "issuedQty" REAL NOT NULL DEFAULT 0,
    "uom" TEXT NOT NULL DEFAULT 'KG',
    CONSTRAINT "batch_materials_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "quality_standards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "itemId" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quality_standards_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "quality_standard_parameters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "standardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "minValue" REAL,
    "maxValue" REAL,
    "targetValue" REAL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "quality_standard_parameters_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "quality_standards" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "quality_tests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "standardId" TEXT,
    "itemId" TEXT,
    "productionBatchId" TEXT,
    "batchNumber" TEXT,
    "testType" TEXT NOT NULL,
    "testStage" TEXT,
    "samplePoint" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "releaseDecision" TEXT,
    "releasedAt" DATETIME,
    "releasedById" TEXT,
    "requestedById" TEXT NOT NULL,
    "testedById" TEXT,
    "sampleQty" REAL,
    "sampleUnit" TEXT,
    "notes" TEXT,
    "testedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quality_tests_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "quality_standards" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quality_tests_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quality_tests_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "production_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "quality_test_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "unit" TEXT,
    "minValue" REAL,
    "maxValue" REAL,
    "targetValue" REAL,
    "actualValue" REAL,
    "textResult" TEXT,
    "isPassed" BOOLEAN,
    "notes" TEXT,
    CONSTRAINT "quality_test_results_testId_fkey" FOREIGN KEY ("testId") REFERENCES "quality_tests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "non_conformances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "testId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "disposition" TEXT,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "reportedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "resolvedAt" DATETIME,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "non_conformances_testId_fkey" FOREIGN KEY ("testId") REFERENCES "quality_tests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "fg_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "uom" TEXT NOT NULL DEFAULT 'UNIT',
    "unitPrice" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "fg_lots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lotNumber" TEXT,
    "quantityIn" REAL NOT NULL,
    "quantityOut" REAL NOT NULL DEFAULT 0,
    "unitCost" REAL,
    "bestBefore" DATETIME,
    "warehouseId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fg_lots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "fg_products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fg_lots_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "dispatch_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "customerName" TEXT NOT NULL,
    "customerContact" TEXT,
    "deliveryAddress" TEXT,
    "scheduledDate" DATETIME,
    "dispatchedAt" DATETIME,
    "deliveredAt" DATETIME,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "dispatch_orders_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "dispatch_orders_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "dispatch_order_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "lotId" TEXT,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'UNIT',
    "unitPrice" REAL,
    "totalPrice" REAL,
    CONSTRAINT "dispatch_order_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "dispatch_orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dispatch_order_lines_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "fg_lots" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "parentId" TEXT,
    "description" TEXT,
    "openingBalance" REAL NOT NULL DEFAULT 0,
    "currentBalance" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "voucherType" TEXT NOT NULL DEFAULT 'JOURNAL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalDebit" REAL NOT NULL DEFAULT 0,
    "totalCredit" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "exchangeRate" REAL,
    "createdById" TEXT NOT NULL,
    "postedAt" DATETIME,
    "reversedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "journal_entry_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "description" TEXT,
    "debit" REAL NOT NULL DEFAULT 0,
    "credit" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "journal_entry_lines_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "journal_entry_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountNumber" TEXT,
    "bankName" TEXT,
    "branch" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "accountType" TEXT NOT NULL DEFAULT 'BANK',
    "currentBalance" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "cashbook_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PAYMENT',
    "category" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "counterparty" TEXT,
    "amount" REAL NOT NULL,
    "transferToId" TEXT,
    "notes" TEXT,
    "pvNumber" INTEGER,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "chequeRef" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cashbook_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cashbook_entries_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cashbook_entries_transferToId_fkey" FOREIGN KEY ("transferToId") REFERENCES "bank_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "pv_sequences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "lastPV" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "pv_sequences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cleared" BOOLEAN NOT NULL DEFAULT false,
    "clearedAt" DATETIME,
    "amount" REAL NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "transactionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "counterparty" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bank_transactions_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "exchangeRate" REAL,
    "baseCurrencyAmount" REAL,
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "effectiveDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL
);
CREATE TABLE "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "externalId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "contactPerson" TEXT,
    "creditLimit" REAL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "externalId" TEXT,
    "reference" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiredDate" DATETIME,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "notes" TEXT,
    "dispatchRef" TEXT,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sales_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "sales_order_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "externalId" TEXT,
    "productCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "sales_order_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "sales_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "sales_kpis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "target" REAL NOT NULL DEFAULT 0,
    "achieved" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sales_kpis_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "sales_webhook_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalId" TEXT,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "error" TEXT,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "daily_truck_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "reportDate" DATETIME NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalVehicles" INTEGER NOT NULL DEFAULT 0,
    "onTrip" INTEGER NOT NULL DEFAULT 0,
    "present" INTEGER NOT NULL DEFAULT 0,
    "maintenance" INTEGER NOT NULL DEFAULT 0,
    "offsite" INTEGER NOT NULL DEFAULT 0,
    "other" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "daily_truck_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "daily_truck_movement_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "vehicleStatus" TEXT NOT NULL DEFAULT 'PRESENT',
    "tripId" TEXT,
    "destination" TEXT,
    "departureTime" DATETIME,
    "expectedReturn" DATETIME,
    "odometerOut" REAL,
    "fuelLevel" TEXT,
    "remarks" TEXT,
    CONSTRAINT "daily_truck_movement_entries_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "daily_truck_movements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "daily_truck_movement_entries_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "daily_truck_movement_entries_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "daily_truck_movement_entries_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip_orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "tra_stamp_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "stampType" TEXT NOT NULL DEFAULT 'BEER',
    "quantity" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "serialFrom" TEXT,
    "serialTo" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL
);
CREATE TABLE "tra_stamp_activations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "activatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "tra_stamp_activations_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "tra_stamp_batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "tally_sync_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "vouchersIn" INTEGER NOT NULL DEFAULT 0,
    "ledgersIn" INTEGER NOT NULL DEFAULT 0,
    "errorMsg" TEXT,
    "triggeredBy" TEXT NOT NULL DEFAULT 'agent',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "tally_vouchers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "tallyId" TEXT NOT NULL,
    "voucherType" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "narration" TEXT,
    "amount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "partyName" TEXT,
    "ledgerEntries" TEXT NOT NULL,
    "rawXml" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "tally_ledgers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT,
    "openingBal" REAL NOT NULL DEFAULT 0,
    "closingBal" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "tally_api_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL
);
CREATE TABLE "cotton_seasons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL
);
CREATE TABLE "cotton_bales" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "baleNumber" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "grade" TEXT NOT NULL DEFAULT 'A',
    "ginnery" TEXT,
    "lotId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "cotton_bales_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "cotton_seasons" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cotton_bales_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "cotton_lots" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "cotton_lots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "totalWeight" REAL NOT NULL DEFAULT 0,
    "baleCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "cotton_lots_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "cotton_seasons" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "cotton_buyers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "country" TEXT,
    "taxNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL
);
CREATE TABLE "cotton_contracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "pricePerKg" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalWeight" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "contractDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "cotton_contracts_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "cotton_buyers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "cotton_contract_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 0,
    "amount" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "cotton_contract_lines_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "cotton_contracts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cotton_contract_lines_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "cotton_lots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "cotton_invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "totalWeight" REAL NOT NULL DEFAULT 0,
    "pricePerKg" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issuedAt" DATETIME,
    "dueDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "cotton_invoices_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "cotton_contracts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "brewing_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "batchId" TEXT,
    "reference" TEXT NOT NULL,
    "brewDate" DATETIME NOT NULL,
    "brand" TEXT NOT NULL,
    "brewNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "brewing_sessions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "brewing_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "unit" TEXT,
    "target" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "actual" TEXT,
    "reasonOutSpec" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "brewing_activities_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "brewing_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "brew_material_usages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "batchId" TEXT,
    "reference" TEXT NOT NULL,
    "brewDate" DATETIME NOT NULL,
    "brand" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "brew_material_usages_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "brew_material_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usageId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "uom" TEXT,
    "targetQty" REAL,
    "actualQty" REAL,
    "additionalQty" REAL,
    "recommendedQty" REAL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "brew_material_items_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "brew_material_usages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "cip_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "vessel" TEXT NOT NULL,
    "cipDate" DATETIME NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "causticTemp" REAL,
    "causticHL" REAL,
    "causticTimeMin" REAL,
    "causticCondition" TEXT,
    "pushWaterHL" REAL,
    "nitricAcidPct" REAL,
    "nitricHL" REAL,
    "nitricTimeMin" REAL,
    "rinsingWaterHL" REAL,
    "rinsingTimeMin" REAL,
    "carryOver" TEXT,
    "operatorSign" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "unitank_analyses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "batchId" TEXT,
    "tankNumber" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "sampleDate" DATETIME NOT NULL,
    "sampleTime" TEXT,
    "alc" REAL,
    "oe" REAL,
    "pg" REAL,
    "ph" REAL,
    "fg" REAL,
    "col" REAL,
    "bu" REAL,
    "adf" REAL,
    "analystId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "unitank_analyses_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "bbt_analyses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "batchId" TEXT,
    "fromTankNumber" TEXT,
    "bbtNumber" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "sampleDate" DATETIME NOT NULL,
    "sampleTime" TEXT,
    "pg" REAL,
    "og" REAL,
    "alc" REAL,
    "haze" REAL,
    "ph" REAL,
    "col" REAL,
    "dissolvedO2" REAL,
    "bitterness" REAL,
    "bbtTemp" REAL,
    "adf" REAL,
    "analystId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bbt_analyses_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "micro_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "reportDate" DATETIME NOT NULL,
    "analystId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "micro_report_samples" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "sampleType" TEXT NOT NULL,
    "sampleSource" TEXT,
    "brand" TEXT,
    "desiredDetection" TEXT,
    "incubation" TEXT,
    "media" TEXT,
    "result" TEXT,
    "isInSpec" BOOLEAN,
    "actual" TEXT,
    "remarks" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "micro_report_samples_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "micro_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "product_specs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "productCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "product_spec_parameters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "specId" TEXT NOT NULL,
    "paramName" TEXT NOT NULL,
    "unit" TEXT,
    "target" TEXT,
    "rangeMin" TEXT,
    "rangeMax" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "product_spec_parameters_specId_fkey" FOREIGN KEY ("specId") REFERENCES "product_specs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");
CREATE INDEX "branches_companyId_idx" ON "branches"("companyId");
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");
CREATE INDEX "departments_companyId_idx" ON "departments"("companyId");
CREATE INDEX "departments_branchId_idx" ON "departments"("branchId");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_isActive_idx" ON "users"("isActive");
CREATE INDEX "users_companyId_idx" ON "users"("companyId");
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");
CREATE UNIQUE INDEX "permissions_module_resource_action_key" ON "permissions"("module", "resource", "action");
CREATE UNIQUE INDEX "user_roles_userId_roleId_branchId_key" ON "user_roles"("userId", "roleId", "branchId");
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_isActive_expiresAt_idx" ON "sessions"("isActive", "expiresAt");
CREATE UNIQUE INDEX "employees_employeeNumber_key" ON "employees"("employeeNumber");
CREATE INDEX "employees_companyId_idx" ON "employees"("companyId");
CREATE INDEX "employees_status_idx" ON "employees"("status");
CREATE INDEX "employees_branchId_idx" ON "employees"("branchId");
CREATE INDEX "employees_departmentId_idx" ON "employees"("departmentId");
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");
CREATE INDEX "settings_companyId_idx" ON "settings"("companyId");
CREATE INDEX "settings_category_idx" ON "settings"("category");
CREATE INDEX "audit_logs_module_resource_idx" ON "audit_logs"("module", "resource");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_recordId_idx" ON "audit_logs"("recordId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE UNIQUE INDEX "approval_workflows_companyId_module_resource_key" ON "approval_workflows"("companyId", "module", "resource");
CREATE UNIQUE INDEX "approval_workflow_steps_workflowId_stepNumber_key" ON "approval_workflow_steps"("workflowId", "stepNumber");
CREATE INDEX "approval_requests_module_resource_recordId_idx" ON "approval_requests"("module", "resource", "recordId");
CREATE INDEX "approval_requests_requestedById_idx" ON "approval_requests"("requestedById");
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");
CREATE INDEX "warehouses_companyId_idx" ON "warehouses"("companyId");
CREATE UNIQUE INDEX "warehouses_companyId_code_key" ON "warehouses"("companyId", "code");
CREATE UNIQUE INDEX "storage_locations_warehouseId_code_key" ON "storage_locations"("warehouseId", "code");
CREATE INDEX "item_categories_companyId_idx" ON "item_categories"("companyId");
CREATE UNIQUE INDEX "item_categories_companyId_code_key" ON "item_categories"("companyId", "code");
CREATE INDEX "units_of_measure_companyId_idx" ON "units_of_measure"("companyId");
CREATE UNIQUE INDEX "units_of_measure_companyId_code_key" ON "units_of_measure"("companyId", "code");
CREATE INDEX "items_companyId_idx" ON "items"("companyId");
CREATE INDEX "items_categoryId_idx" ON "items"("categoryId");
CREATE INDEX "items_isActive_idx" ON "items"("isActive");
CREATE UNIQUE INDEX "items_companyId_code_key" ON "items"("companyId", "code");
CREATE INDEX "stock_balances_warehouseId_idx" ON "stock_balances"("warehouseId");
CREATE INDEX "stock_balances_itemId_idx" ON "stock_balances"("itemId");
CREATE UNIQUE INDEX "stock_balances_itemId_warehouseId_locationId_key" ON "stock_balances"("itemId", "warehouseId", "locationId");
CREATE INDEX "stock_ledger_itemId_warehouseId_idx" ON "stock_ledger"("itemId", "warehouseId");
CREATE INDEX "stock_ledger_referenceType_referenceId_idx" ON "stock_ledger"("referenceType", "referenceId");
CREATE INDEX "stock_ledger_createdAt_idx" ON "stock_ledger"("createdAt");
CREATE UNIQUE INDEX "goods_received_notes_reference_key" ON "goods_received_notes"("reference");
CREATE INDEX "goods_received_notes_companyId_idx" ON "goods_received_notes"("companyId");
CREATE INDEX "goods_received_notes_status_idx" ON "goods_received_notes"("status");
CREATE INDEX "goods_received_notes_warehouseId_idx" ON "goods_received_notes"("warehouseId");
CREATE INDEX "goods_received_notes_companyId_createdAt_idx" ON "goods_received_notes"("companyId", "createdAt");
CREATE UNIQUE INDEX "stock_transfers_reference_key" ON "stock_transfers"("reference");
CREATE INDEX "stock_transfers_companyId_idx" ON "stock_transfers"("companyId");
CREATE INDEX "stock_transfers_status_idx" ON "stock_transfers"("status");
CREATE INDEX "stock_transfers_fromWarehouseId_idx" ON "stock_transfers"("fromWarehouseId");
CREATE INDEX "stock_transfers_toWarehouseId_idx" ON "stock_transfers"("toWarehouseId");
CREATE UNIQUE INDEX "stock_adjustments_reference_key" ON "stock_adjustments"("reference");
CREATE INDEX "stock_adjustments_companyId_idx" ON "stock_adjustments"("companyId");
CREATE INDEX "stock_adjustments_status_idx" ON "stock_adjustments"("status");
CREATE INDEX "stock_adjustments_warehouseId_idx" ON "stock_adjustments"("warehouseId");
CREATE UNIQUE INDEX "store_issues_reference_key" ON "store_issues"("reference");
CREATE INDEX "store_issues_companyId_issueDate_idx" ON "store_issues"("companyId", "issueDate");
CREATE INDEX "store_issues_warehouseId_idx" ON "store_issues"("warehouseId");
CREATE INDEX "store_issues_issueType_idx" ON "store_issues"("issueType");
CREATE INDEX "store_issue_lines_issueId_idx" ON "store_issue_lines"("issueId");
CREATE INDEX "store_issue_lines_itemId_idx" ON "store_issue_lines"("itemId");
CREATE UNIQUE INDEX "vehicles_plateNumber_key" ON "vehicles"("plateNumber");
CREATE INDEX "vehicles_companyId_idx" ON "vehicles"("companyId");
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");
CREATE UNIQUE INDEX "drivers_employeeId_key" ON "drivers"("employeeId");
CREATE INDEX "drivers_companyId_idx" ON "drivers"("companyId");
CREATE INDEX "drivers_status_idx" ON "drivers"("status");
CREATE INDEX "drivers_isAvailable_idx" ON "drivers"("isAvailable");
CREATE INDEX "vehicle_assignments_vehicleId_idx" ON "vehicle_assignments"("vehicleId");
CREATE INDEX "vehicle_assignments_driverId_idx" ON "vehicle_assignments"("driverId");
CREATE UNIQUE INDEX "trip_orders_reference_key" ON "trip_orders"("reference");
CREATE INDEX "trip_orders_companyId_idx" ON "trip_orders"("companyId");
CREATE INDEX "trip_orders_status_idx" ON "trip_orders"("status");
CREATE INDEX "trip_orders_vehicleId_idx" ON "trip_orders"("vehicleId");
CREATE INDEX "trip_orders_driverId_idx" ON "trip_orders"("driverId");
CREATE INDEX "trip_orders_companyId_createdAt_idx" ON "trip_orders"("companyId", "createdAt");
CREATE INDEX "trip_logs_tripId_idx" ON "trip_logs"("tripId");
CREATE INDEX "vehicle_incidents_companyId_idx" ON "vehicle_incidents"("companyId");
CREATE INDEX "vehicle_incidents_vehicleId_idx" ON "vehicle_incidents"("vehicleId");
CREATE INDEX "vehicle_incidents_status_idx" ON "vehicle_incidents"("status");
CREATE UNIQUE INDEX "fuel_tanks_code_key" ON "fuel_tanks"("code");
CREATE INDEX "fuel_tanks_companyId_idx" ON "fuel_tanks"("companyId");
CREATE UNIQUE INDEX "fuel_receipts_reference_key" ON "fuel_receipts"("reference");
CREATE INDEX "fuel_receipts_companyId_idx" ON "fuel_receipts"("companyId");
CREATE INDEX "fuel_receipts_status_idx" ON "fuel_receipts"("status");
CREATE UNIQUE INDEX "fuel_issues_reference_key" ON "fuel_issues"("reference");
CREATE INDEX "fuel_issues_companyId_idx" ON "fuel_issues"("companyId");
CREATE INDEX "fuel_issues_vehicleId_idx" ON "fuel_issues"("vehicleId");
CREATE INDEX "fuel_issues_issuedAt_idx" ON "fuel_issues"("issuedAt");
CREATE INDEX "fuel_issues_tankId_idx" ON "fuel_issues"("tankId");
CREATE INDEX "fuel_issues_driverId_idx" ON "fuel_issues"("driverId");
CREATE INDEX "fuel_prices_companyId_fuelType_idx" ON "fuel_prices"("companyId", "fuelType");
CREATE INDEX "maintenance_schedules_vehicleId_idx" ON "maintenance_schedules"("vehicleId");
CREATE UNIQUE INDEX "work_orders_reference_key" ON "work_orders"("reference");
CREATE INDEX "work_orders_companyId_idx" ON "work_orders"("companyId");
CREATE INDEX "work_orders_status_idx" ON "work_orders"("status");
CREATE INDEX "work_orders_vehicleId_idx" ON "work_orders"("vehicleId");
CREATE UNIQUE INDEX "spare_part_categories_companyId_code_key" ON "spare_part_categories"("companyId", "code");
CREATE INDEX "spare_parts_companyId_idx" ON "spare_parts"("companyId");
CREATE UNIQUE INDEX "spare_parts_companyId_code_key" ON "spare_parts"("companyId", "code");
CREATE INDEX "spare_part_transactions_sparePartId_idx" ON "spare_part_transactions"("sparePartId");
CREATE INDEX "spare_part_transactions_createdAt_idx" ON "spare_part_transactions"("createdAt");
CREATE INDEX "suppliers_companyId_idx" ON "suppliers"("companyId");
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");
CREATE UNIQUE INDEX "suppliers_companyId_code_key" ON "suppliers"("companyId", "code");
CREATE UNIQUE INDEX "purchase_requests_reference_key" ON "purchase_requests"("reference");
CREATE INDEX "purchase_requests_companyId_idx" ON "purchase_requests"("companyId");
CREATE INDEX "purchase_requests_status_idx" ON "purchase_requests"("status");
CREATE INDEX "purchase_requests_requestedById_idx" ON "purchase_requests"("requestedById");
CREATE INDEX "purchase_request_lines_requestId_idx" ON "purchase_request_lines"("requestId");
CREATE UNIQUE INDEX "purchase_orders_reference_key" ON "purchase_orders"("reference");
CREATE INDEX "purchase_orders_companyId_idx" ON "purchase_orders"("companyId");
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");
CREATE INDEX "purchase_order_lines_purchaseOrderId_idx" ON "purchase_order_lines"("purchaseOrderId");
CREATE INDEX "production_lines_companyId_idx" ON "production_lines"("companyId");
CREATE INDEX "production_lines_status_idx" ON "production_lines"("status");
CREATE UNIQUE INDEX "production_lines_companyId_code_key" ON "production_lines"("companyId", "code");
CREATE INDEX "production_recipes_companyId_idx" ON "production_recipes"("companyId");
CREATE INDEX "production_recipes_status_idx" ON "production_recipes"("status");
CREATE UNIQUE INDEX "production_recipes_companyId_code_version_key" ON "production_recipes"("companyId", "code", "version");
CREATE INDEX "recipe_materials_recipeId_idx" ON "recipe_materials"("recipeId");
CREATE UNIQUE INDEX "production_batches_reference_key" ON "production_batches"("reference");
CREATE INDEX "production_batches_companyId_idx" ON "production_batches"("companyId");
CREATE INDEX "production_batches_status_idx" ON "production_batches"("status");
CREATE INDEX "production_batches_lineId_idx" ON "production_batches"("lineId");
CREATE INDEX "production_batches_recipeId_idx" ON "production_batches"("recipeId");
CREATE INDEX "production_batches_companyId_createdAt_idx" ON "production_batches"("companyId", "createdAt");
CREATE INDEX "batch_materials_batchId_idx" ON "batch_materials"("batchId");
CREATE INDEX "quality_standards_companyId_idx" ON "quality_standards"("companyId");
CREATE INDEX "quality_standards_itemId_idx" ON "quality_standards"("itemId");
CREATE INDEX "quality_standard_parameters_standardId_idx" ON "quality_standard_parameters"("standardId");
CREATE UNIQUE INDEX "quality_tests_reference_key" ON "quality_tests"("reference");
CREATE INDEX "quality_tests_companyId_idx" ON "quality_tests"("companyId");
CREATE INDEX "quality_tests_standardId_idx" ON "quality_tests"("standardId");
CREATE INDEX "quality_tests_itemId_idx" ON "quality_tests"("itemId");
CREATE INDEX "quality_tests_productionBatchId_idx" ON "quality_tests"("productionBatchId");
CREATE INDEX "quality_tests_status_idx" ON "quality_tests"("status");
CREATE INDEX "quality_tests_testStage_idx" ON "quality_tests"("testStage");
CREATE INDEX "quality_test_results_testId_idx" ON "quality_test_results"("testId");
CREATE UNIQUE INDEX "non_conformances_reference_key" ON "non_conformances"("reference");
CREATE INDEX "non_conformances_companyId_idx" ON "non_conformances"("companyId");
CREATE INDEX "non_conformances_testId_idx" ON "non_conformances"("testId");
CREATE INDEX "non_conformances_status_idx" ON "non_conformances"("status");
CREATE INDEX "fg_products_companyId_idx" ON "fg_products"("companyId");
CREATE UNIQUE INDEX "fg_products_companyId_code_key" ON "fg_products"("companyId", "code");
CREATE INDEX "fg_lots_companyId_idx" ON "fg_lots"("companyId");
CREATE INDEX "fg_lots_productId_idx" ON "fg_lots"("productId");
CREATE INDEX "fg_lots_status_idx" ON "fg_lots"("status");
CREATE UNIQUE INDEX "dispatch_orders_reference_key" ON "dispatch_orders"("reference");
CREATE INDEX "dispatch_orders_companyId_idx" ON "dispatch_orders"("companyId");
CREATE INDEX "dispatch_orders_status_idx" ON "dispatch_orders"("status");
CREATE INDEX "dispatch_orders_vehicleId_idx" ON "dispatch_orders"("vehicleId");
CREATE INDEX "dispatch_orders_driverId_idx" ON "dispatch_orders"("driverId");
CREATE INDEX "dispatch_orders_companyId_createdAt_idx" ON "dispatch_orders"("companyId", "createdAt");
CREATE INDEX "dispatch_order_lines_orderId_idx" ON "dispatch_order_lines"("orderId");
CREATE INDEX "dispatch_order_lines_lotId_idx" ON "dispatch_order_lines"("lotId");
CREATE INDEX "accounts_companyId_idx" ON "accounts"("companyId");
CREATE INDEX "accounts_accountType_idx" ON "accounts"("accountType");
CREATE INDEX "accounts_isActive_idx" ON "accounts"("isActive");
CREATE UNIQUE INDEX "accounts_companyId_code_key" ON "accounts"("companyId", "code");
CREATE INDEX "journal_entries_companyId_idx" ON "journal_entries"("companyId");
CREATE INDEX "journal_entries_status_idx" ON "journal_entries"("status");
CREATE INDEX "journal_entries_entryDate_idx" ON "journal_entries"("entryDate");
CREATE INDEX "journal_entries_companyId_entryDate_idx" ON "journal_entries"("companyId", "entryDate");
CREATE INDEX "journal_entries_companyId_status_idx" ON "journal_entries"("companyId", "status");
CREATE INDEX "journal_entry_lines_journalEntryId_idx" ON "journal_entry_lines"("journalEntryId");
CREATE INDEX "journal_entry_lines_accountId_idx" ON "journal_entry_lines"("accountId");
CREATE INDEX "bank_accounts_companyId_idx" ON "bank_accounts"("companyId");
CREATE INDEX "bank_accounts_isActive_idx" ON "bank_accounts"("isActive");
CREATE INDEX "cashbook_entries_companyId_idx" ON "cashbook_entries"("companyId");
CREATE INDEX "cashbook_entries_bankAccountId_idx" ON "cashbook_entries"("bankAccountId");
CREATE INDEX "cashbook_entries_date_idx" ON "cashbook_entries"("date");
CREATE UNIQUE INDEX "pv_sequences_companyId_key" ON "pv_sequences"("companyId");
CREATE INDEX "bank_transactions_companyId_idx" ON "bank_transactions"("companyId");
CREATE INDEX "bank_transactions_bankAccountId_idx" ON "bank_transactions"("bankAccountId");
CREATE INDEX "bank_transactions_transactionDate_idx" ON "bank_transactions"("transactionDate");
CREATE INDEX "payments_companyId_idx" ON "payments"("companyId");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate");
CREATE INDEX "payments_companyId_paymentDate_idx" ON "payments"("companyId", "paymentDate");
CREATE INDEX "payment_allocations_paymentId_idx" ON "payment_allocations"("paymentId");
CREATE INDEX "payment_allocations_documentId_idx" ON "payment_allocations"("documentId");
CREATE INDEX "exchange_rates_companyId_idx" ON "exchange_rates"("companyId");
CREATE INDEX "exchange_rates_fromCurrency_toCurrency_idx" ON "exchange_rates"("fromCurrency", "toCurrency");
CREATE UNIQUE INDEX "exchange_rates_companyId_fromCurrency_toCurrency_effectiveDate_key" ON "exchange_rates"("companyId", "fromCurrency", "toCurrency", "effectiveDate");
CREATE INDEX "customers_companyId_idx" ON "customers"("companyId");
CREATE UNIQUE INDEX "customers_companyId_code_key" ON "customers"("companyId", "code");
CREATE INDEX "sales_orders_companyId_idx" ON "sales_orders"("companyId");
CREATE INDEX "sales_orders_customerId_idx" ON "sales_orders"("customerId");
CREATE INDEX "sales_orders_status_idx" ON "sales_orders"("status");
CREATE UNIQUE INDEX "sales_orders_companyId_reference_key" ON "sales_orders"("companyId", "reference");
CREATE INDEX "sales_order_lines_orderId_idx" ON "sales_order_lines"("orderId");
CREATE INDEX "sales_kpis_companyId_idx" ON "sales_kpis"("companyId");
CREATE UNIQUE INDEX "sales_kpis_companyId_period_metric_key" ON "sales_kpis"("companyId", "period", "metric");
CREATE INDEX "sales_webhook_logs_companyId_idx" ON "sales_webhook_logs"("companyId");
CREATE INDEX "sales_webhook_logs_eventType_idx" ON "sales_webhook_logs"("eventType");
CREATE UNIQUE INDEX "daily_truck_movements_reference_key" ON "daily_truck_movements"("reference");
CREATE INDEX "daily_truck_movements_companyId_idx" ON "daily_truck_movements"("companyId");
CREATE UNIQUE INDEX "daily_truck_movements_companyId_reportDate_key" ON "daily_truck_movements"("companyId", "reportDate");
CREATE INDEX "daily_truck_movement_entries_vehicleId_idx" ON "daily_truck_movement_entries"("vehicleId");
CREATE INDEX "daily_truck_movement_entries_driverId_idx" ON "daily_truck_movement_entries"("driverId");
CREATE UNIQUE INDEX "daily_truck_movement_entries_reportId_vehicleId_key" ON "daily_truck_movement_entries"("reportId", "vehicleId");
CREATE UNIQUE INDEX "tra_stamp_batches_batchNumber_key" ON "tra_stamp_batches"("batchNumber");
CREATE INDEX "tra_stamp_batches_companyId_idx" ON "tra_stamp_batches"("companyId");
CREATE UNIQUE INDEX "tra_stamp_activations_reference_key" ON "tra_stamp_activations"("reference");
CREATE INDEX "tra_stamp_activations_companyId_idx" ON "tra_stamp_activations"("companyId");
CREATE INDEX "tally_sync_logs_companyId_idx" ON "tally_sync_logs"("companyId");
CREATE INDEX "tally_vouchers_companyId_idx" ON "tally_vouchers"("companyId");
CREATE INDEX "tally_vouchers_voucherType_idx" ON "tally_vouchers"("voucherType");
CREATE INDEX "tally_vouchers_date_idx" ON "tally_vouchers"("date");
CREATE UNIQUE INDEX "tally_vouchers_companyId_tallyId_key" ON "tally_vouchers"("companyId", "tallyId");
CREATE INDEX "tally_ledgers_companyId_idx" ON "tally_ledgers"("companyId");
CREATE UNIQUE INDEX "tally_ledgers_companyId_name_key" ON "tally_ledgers"("companyId", "name");
CREATE UNIQUE INDEX "tally_api_keys_keyHash_key" ON "tally_api_keys"("keyHash");
CREATE INDEX "tally_api_keys_companyId_idx" ON "tally_api_keys"("companyId");
CREATE INDEX "cotton_seasons_companyId_idx" ON "cotton_seasons"("companyId");
CREATE INDEX "cotton_bales_companyId_idx" ON "cotton_bales"("companyId");
CREATE INDEX "cotton_bales_seasonId_idx" ON "cotton_bales"("seasonId");
CREATE INDEX "cotton_bales_lotId_idx" ON "cotton_bales"("lotId");
CREATE UNIQUE INDEX "cotton_bales_companyId_baleNumber_key" ON "cotton_bales"("companyId", "baleNumber");
CREATE INDEX "cotton_lots_companyId_idx" ON "cotton_lots"("companyId");
CREATE INDEX "cotton_lots_seasonId_idx" ON "cotton_lots"("seasonId");
CREATE INDEX "cotton_lots_status_idx" ON "cotton_lots"("status");
CREATE UNIQUE INDEX "cotton_lots_companyId_lotNumber_key" ON "cotton_lots"("companyId", "lotNumber");
CREATE INDEX "cotton_buyers_companyId_idx" ON "cotton_buyers"("companyId");
CREATE INDEX "cotton_contracts_companyId_idx" ON "cotton_contracts"("companyId");
CREATE INDEX "cotton_contracts_buyerId_idx" ON "cotton_contracts"("buyerId");
CREATE INDEX "cotton_contracts_status_idx" ON "cotton_contracts"("status");
CREATE UNIQUE INDEX "cotton_contracts_companyId_contractNumber_key" ON "cotton_contracts"("companyId", "contractNumber");
CREATE UNIQUE INDEX "cotton_contract_lines_contractId_lotId_key" ON "cotton_contract_lines"("contractId", "lotId");
CREATE INDEX "cotton_invoices_companyId_idx" ON "cotton_invoices"("companyId");
CREATE INDEX "cotton_invoices_contractId_idx" ON "cotton_invoices"("contractId");
CREATE INDEX "cotton_invoices_status_idx" ON "cotton_invoices"("status");
CREATE UNIQUE INDEX "cotton_invoices_companyId_invoiceNumber_key" ON "cotton_invoices"("companyId", "invoiceNumber");
CREATE UNIQUE INDEX "brewing_sessions_reference_key" ON "brewing_sessions"("reference");
CREATE INDEX "brewing_sessions_companyId_idx" ON "brewing_sessions"("companyId");
CREATE INDEX "brewing_sessions_batchId_idx" ON "brewing_sessions"("batchId");
CREATE INDEX "brewing_sessions_brewDate_idx" ON "brewing_sessions"("brewDate");
CREATE INDEX "brewing_activities_sessionId_idx" ON "brewing_activities"("sessionId");
CREATE UNIQUE INDEX "brew_material_usages_reference_key" ON "brew_material_usages"("reference");
CREATE INDEX "brew_material_usages_companyId_idx" ON "brew_material_usages"("companyId");
CREATE INDEX "brew_material_usages_batchId_idx" ON "brew_material_usages"("batchId");
CREATE INDEX "brew_material_usages_brewDate_idx" ON "brew_material_usages"("brewDate");
CREATE INDEX "brew_material_items_usageId_idx" ON "brew_material_items"("usageId");
CREATE INDEX "cip_records_companyId_idx" ON "cip_records"("companyId");
CREATE INDEX "cip_records_cipDate_idx" ON "cip_records"("cipDate");
CREATE INDEX "cip_records_vessel_idx" ON "cip_records"("vessel");
CREATE INDEX "unitank_analyses_companyId_idx" ON "unitank_analyses"("companyId");
CREATE INDEX "unitank_analyses_batchId_idx" ON "unitank_analyses"("batchId");
CREATE INDEX "unitank_analyses_sampleDate_idx" ON "unitank_analyses"("sampleDate");
CREATE INDEX "bbt_analyses_companyId_idx" ON "bbt_analyses"("companyId");
CREATE INDEX "bbt_analyses_batchId_idx" ON "bbt_analyses"("batchId");
CREATE INDEX "bbt_analyses_sampleDate_idx" ON "bbt_analyses"("sampleDate");
CREATE UNIQUE INDEX "micro_reports_reference_key" ON "micro_reports"("reference");
CREATE INDEX "micro_reports_companyId_idx" ON "micro_reports"("companyId");
CREATE INDEX "micro_reports_reportDate_idx" ON "micro_reports"("reportDate");
CREATE INDEX "micro_report_samples_reportId_idx" ON "micro_report_samples"("reportId");
CREATE INDEX "product_specs_companyId_idx" ON "product_specs"("companyId");
CREATE INDEX "product_spec_parameters_specId_idx" ON "product_spec_parameters"("specId");
INSERT INTO "companies" ("id", "name", "legalName", "registrationNumber", "taxNumber", "address", "city", "country", "phone", "email", "website", "logoPath", "currency", "dateFormat", "fiscalYearStart", "isActive", "createdAt", "updatedAt") VALUES ('company_main', 'Your Company Name', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TZS', 'YYYY-MM-DD', 1, 1, '2026-08-21T17:42:23.425+00:00', '2026-08-21T17:42:23.425+00:00');
INSERT INTO "branches" ("id", "companyId", "name", "code", "address", "city", "phone", "email", "managerId", "isMain", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnf200017dszik1kq289', 'company_main', 'Head Office', 'HQ', NULL, NULL, NULL, NULL, NULL, 1, 1, '2026-08-21T17:42:23.438+00:00', '2026-08-21T17:42:23.438+00:00', 'system');
INSERT INTO "departments" ("id", "companyId", "branchId", "name", "code", "description", "parentId", "headEmployeeId", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnfc00037dsz68gfkngo', 'company_main', 'cmt38lnf200017dszik1kq289', 'Administration', 'ADMIN', NULL, NULL, NULL, 1, '2026-08-21T17:42:23.449+00:00', '2026-08-21T17:42:23.449+00:00', 'system');
INSERT INTO "departments" ("id", "companyId", "branchId", "name", "code", "description", "parentId", "headEmployeeId", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnfk00057dszf86wwkea', 'company_main', 'cmt38lnf200017dszik1kq289', 'Operations', 'OPS', NULL, NULL, NULL, 1, '2026-08-21T17:42:23.457+00:00', '2026-08-21T17:42:23.457+00:00', 'system');
INSERT INTO "departments" ("id", "companyId", "branchId", "name", "code", "description", "parentId", "headEmployeeId", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnfq00077dszu9jbz2b7', 'company_main', 'cmt38lnf200017dszik1kq289', 'Finance', 'FIN', NULL, NULL, NULL, 1, '2026-08-21T17:42:23.463+00:00', '2026-08-21T17:42:23.463+00:00', 'system');
INSERT INTO "departments" ("id", "companyId", "branchId", "name", "code", "description", "parentId", "headEmployeeId", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnfw00097dszplncvtq0', 'company_main', 'cmt38lnf200017dszik1kq289', 'Warehouse', 'WH', NULL, NULL, NULL, 1, '2026-08-21T17:42:23.469+00:00', '2026-08-21T17:42:23.469+00:00', 'system');
INSERT INTO "departments" ("id", "companyId", "branchId", "name", "code", "description", "parentId", "headEmployeeId", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lng2000b7dsz3qmh5poh', 'company_main', 'cmt38lnf200017dszik1kq289', 'Transport', 'TRANS', NULL, NULL, NULL, 1, '2026-08-21T17:42:23.475+00:00', '2026-08-21T17:42:23.475+00:00', 'system');
INSERT INTO "departments" ("id", "companyId", "branchId", "name", "code", "description", "parentId", "headEmployeeId", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lng9000d7dszf3ktj7p0', 'company_main', 'cmt38lnf200017dszik1kq289', 'Production', 'PROD', NULL, NULL, NULL, 1, '2026-08-21T17:42:23.481+00:00', '2026-08-21T17:42:23.481+00:00', 'system');
INSERT INTO "departments" ("id", "companyId", "branchId", "name", "code", "description", "parentId", "headEmployeeId", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lngf000f7dszw5wa35r5', 'company_main', 'cmt38lnf200017dszik1kq289', 'Quality Control', 'QC', NULL, NULL, NULL, 1, '2026-08-21T17:42:23.487+00:00', '2026-08-21T17:42:23.487+00:00', 'system');
INSERT INTO "departments" ("id", "companyId", "branchId", "name", "code", "description", "parentId", "headEmployeeId", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lngl000h7dsz3ebcsp4k', 'company_main', 'cmt38lnf200017dszik1kq289', 'Maintenance', 'MAINT', NULL, NULL, NULL, 1, '2026-08-21T17:42:23.494+00:00', '2026-08-21T17:42:23.494+00:00', 'system');
INSERT INTO "departments" ("id", "companyId", "branchId", "name", "code", "description", "parentId", "headEmployeeId", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lngr000j7dszm7jgeuhl', 'company_main', 'cmt38lnf200017dszik1kq289', 'Procurement', 'PROC', NULL, NULL, NULL, 1, '2026-08-21T17:42:23.499+00:00', '2026-08-21T17:42:23.499+00:00', 'system');
INSERT INTO "departments" ("id", "companyId", "branchId", "name", "code", "description", "parentId", "headEmployeeId", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lngw000l7dszqxgcw1dy', 'company_main', 'cmt38lnf200017dszik1kq289', 'Human Resources', 'HR', NULL, NULL, NULL, 1, '2026-08-21T17:42:23.505+00:00', '2026-08-21T17:42:23.505+00:00', 'system');
INSERT INTO "users" ("id", "employeeId", "companyId", "username", "email", "passwordHash", "fullName", "phone", "avatarPath", "isActive", "isSystemUser", "mustChangePassword", "lastLoginAt", "passwordChangedAt", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lo8g007k7dszrqmx0hz6', NULL, 'company_main', 'admin', 'admin@company.local', '$2a$12$ROCRnIZTYyJX8zcWhDwZOuHrAe0aFOoeSyIc5p1mYfdluRB7KXd7S', 'System Administrator', NULL, NULL, 1, 1, 1, NULL, NULL, '2026-08-21T17:42:24.496+00:00', '2026-08-21T17:42:24.496+00:00', NULL);
INSERT INTO "users" ("id", "employeeId", "companyId", "username", "email", "passwordHash", "fullName", "phone", "avatarPath", "isActive", "isSystemUser", "mustChangePassword", "lastLoginAt", "passwordChangedAt", "createdAt", "updatedAt", "createdById") VALUES ('user_superadmin_001', NULL, 'company_main', 'superadmin', 'superadmin@company.local', '$2a$12$WZYYvz8AiyGcvr1sAFRV9.mpm1qYW4UbHpA8vHxI.q2.WGXjw6aIu', 'Super Administrator', NULL, NULL, 1, 1, 1, NULL, NULL, '2026-08-21 17:42:35', '2026-08-21 17:42:35', NULL);
INSERT INTO "roles" ("id", "name", "code", "description", "isSystemRole", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'Super Admin', 'SUPER_ADMIN', 'Full system access', 1, 1, '2026-08-21T17:42:24.055+00:00', '2026-08-21T17:42:24.055+00:00', 'system');
INSERT INTO "roles" ("id", "name", "code", "description", "isSystemRole", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'Company Admin', 'COMPANY_ADMIN', 'Manages company configuration and users', 1, 1, '2026-08-21T17:42:24.058+00:00', '2026-08-21T17:42:24.058+00:00', 'system');
INSERT INTO "roles" ("id", "name", "code", "description", "isSystemRole", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'Branch Manager', 'BRANCH_MANAGER', 'Manages branch operations', 1, 1, '2026-08-21T17:42:24.060+00:00', '2026-08-21T17:42:24.060+00:00', 'system');
INSERT INTO "roles" ("id", "name", "code", "description", "isSystemRole", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'Department Head', 'DEPT_HEAD', 'Manages department, approval authority', 1, 1, '2026-08-21T17:42:24.062+00:00', '2026-08-21T17:42:24.062+00:00', 'system');
INSERT INTO "roles" ("id", "name", "code", "description", "isSystemRole", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'Director', 'DIRECTOR', 'Executive director — full finance visibility and cross-company reporting', 1, 1, '2026-08-21T17:42:24.065+00:00', '2026-08-21T17:42:24.065+00:00', 'system');
INSERT INTO "roles" ("id", "name", "code", "description", "isSystemRole", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'Management', 'MANAGEMENT', 'Read-only analytics and approvals', 1, 1, '2026-08-21T17:42:24.068+00:00', '2026-08-21T17:42:24.068+00:00', 'system');
INSERT INTO "roles" ("id", "name", "code", "description", "isSystemRole", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'Auditor', 'AUDITOR', 'Read-only audit access', 1, 1, '2026-08-21T17:42:24.070+00:00', '2026-08-21T17:42:24.070+00:00', 'system');
INSERT INTO "roles" ("id", "name", "code", "description", "isSystemRole", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'Brew Operator', 'BREW_OPERATOR', 'Records brewing process, material usage, and CIP records', 1, 1, '2026-08-21T17:42:24.073+00:00', '2026-08-21T17:42:24.073+00:00', 'system');
INSERT INTO "roles" ("id", "name", "code", "description", "isSystemRole", "isActive", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lnwr007i7dszcs441b72', 'Lab Technician', 'LAB_TECHNICIAN', 'Records unitank/BBT analyses, micro reports, and product specs', 1, 1, '2026-08-21T17:42:24.076+00:00', '2026-08-21T17:42:24.076+00:00', 'system');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnit00147dszsed94xm7', 'auth', 'session', 'create', 'Login to the system');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lniy00157dsz50isxrbp', 'users', 'user', 'create', 'Create user accounts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnj000167dszzeqkzek2', 'users', 'user', 'read', 'View user accounts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnj200177dszi2cc9pdo', 'users', 'user', 'update', 'Edit user accounts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnj400187dszyyqz6ce0', 'users', 'user', 'deactivate', 'Deactivate user accounts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnj600197dszaeruwfyp', 'users', 'user', 'reset_password', 'Reset user passwords');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnj8001a7dszljbj66vc', 'users', 'user', 'assign_role', 'Assign/remove roles from users');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnja001b7dszhewy4asx', 'roles', 'role', 'create', 'Create roles');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnjc001c7dsz1i7ph2au', 'roles', 'role', 'read', 'View roles');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnje001d7dsz3ov3mfvf', 'roles', 'role', 'update', 'Edit roles');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnjg001e7dszbg6wpygt', 'roles', 'role', 'deactivate', 'Deactivate roles');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnji001f7dszrh9j3hfa', 'roles', 'permission', 'assign', 'Assign permissions to roles');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnjk001g7dsz1biaq1yg', 'company', 'company', 'create', 'Create companies');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnjm001h7dszolxn5gyl', 'company', 'company', 'read', 'View company profile');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnjn001i7dszn2i8qqvq', 'company', 'company', 'update', 'Edit company profile');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnjp001j7dsz7btd1l02', 'company', 'branch', 'create', 'Create branches');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnjr001k7dszxfpzz742', 'company', 'branch', 'read', 'View branches');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnjt001l7dsz1774q0t9', 'company', 'branch', 'update', 'Edit branches');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnjv001m7dszghnkwy4c', 'company', 'branch', 'deactivate', 'Deactivate branches');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnjy001n7dszcr4xjej4', 'company', 'department', 'create', 'Create departments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnk0001o7dsz8b44cu9v', 'company', 'department', 'read', 'View departments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnk2001p7dszagsyp8ig', 'company', 'department', 'update', 'Edit departments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnk4001q7dszna65gp4s', 'company', 'department', 'deactivate', 'Deactivate departments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnk6001r7dszyfdygiyt', 'employees', 'employee', 'create', 'Create employee records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnk8001s7dszq1bweuk6', 'employees', 'employee', 'read', 'View employee records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnka001t7dsztknnnggz', 'employees', 'employee', 'update', 'Edit employee records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnkc001u7dszj8nipvgp', 'employees', 'employee', 'deactivate', 'Change employee status');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnke001v7dsz8zta6do7', 'settings', 'settings', 'read', 'View system settings');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnkg001w7dszea1kqz3j', 'settings', 'settings', 'update', 'Update system settings');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnkj001x7dszvtmz83rp', 'audit', 'log', 'read', 'View audit logs');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnkl001y7dsz2z9b7x8d', 'approvals', 'workflow', 'manage', 'Manage approval workflows');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnkn001z7dszt98o00x3', 'approvals', 'request', 'approve', 'Approve/reject approval requests');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnkp00207dsz544on4ci', 'approvals', 'request', 'read', 'View approval requests');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnkr00217dszqb1hfqmt', 'approvals', 'request', 'cancel', 'Cancel approval requests');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnkt00227dszzw739r27', 'warehouse', 'warehouse', 'read', 'View warehouses');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnkv00237dsze5jacyh9', 'warehouse', 'warehouse', 'create', 'Create warehouses');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnkx00247dszicdzmbui', 'warehouse', 'warehouse', 'update', 'Edit warehouses');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnkz00257dszdh96fqhf', 'warehouse', 'location', 'read', 'View storage locations');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnl100267dszdweshwek', 'warehouse', 'location', 'create', 'Create storage locations');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnl300277dsz9xisv2xi', 'warehouse', 'location', 'update', 'Edit storage locations');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnl500287dszuugc0mfx', 'warehouse', 'item', 'read', 'View items');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnl700297dszngazrsrr', 'warehouse', 'item', 'create', 'Create items');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnl9002a7dszb4tcykdv', 'warehouse', 'item', 'update', 'Edit items');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnlb002b7dszoqpf316i', 'warehouse', 'uom', 'read', 'View units of measure');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnld002c7dszv1nyguqx', 'warehouse', 'uom', 'create', 'Create units of measure');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnlf002d7dszl6c7a3li', 'warehouse', 'uom', 'update', 'Edit units of measure');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnlh002e7dszfjkn2gp1', 'warehouse', 'category', 'read', 'View item categories');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnlj002f7dszajjm1cl1', 'warehouse', 'category', 'create', 'Create item categories');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnll002g7dszwludlmw1', 'warehouse', 'category', 'update', 'Edit item categories');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnln002h7dszjw72c3rx', 'warehouse', 'stock', 'read', 'View stock levels');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnlq002i7dszfxyohwdv', 'warehouse', 'grn', 'read', 'View goods received notes');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnlr002j7dszrhfgf1p9', 'warehouse', 'grn', 'create', 'Create goods received notes');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnlu002k7dsz3x9u8bdt', 'warehouse', 'grn', 'confirm', 'Confirm goods receipt into stock');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnlv002l7dsz74z1bxuo', 'warehouse', 'transfer', 'read', 'View stock transfers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnly002m7dszlpkdtxr2', 'warehouse', 'transfer', 'create', 'Create stock transfers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnm0002n7dszc1uggs6u', 'warehouse', 'transfer', 'dispatch', 'Dispatch stock transfers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnm2002o7dszhxupvg0q', 'warehouse', 'transfer', 'receive', 'Receive stock transfers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnm4002p7dszc614z9hc', 'warehouse', 'adjustment', 'read', 'View stock adjustments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnm6002q7dszsne3409z', 'warehouse', 'adjustment', 'create', 'Create stock adjustments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnm8002r7dszpdo6ulqo', 'warehouse', 'adjustment', 'submit', 'Submit adjustments for approval');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnma002s7dszlgtsrcaf', 'warehouse', 'adjustment', 'approve', 'Approve and apply stock adjustments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnmc002t7dsz6fyeypbh', 'warehouse', 'issue', 'read', 'View store issues and returns');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnme002u7dszl62m1d64', 'warehouse', 'issue', 'create', 'Issue items to production / record returns');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnmg002v7dsz72eyi6hc', 'transport', 'vehicle', 'read', 'View vehicles');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnmi002w7dszsagbhril', 'transport', 'vehicle', 'create', 'Create vehicles');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnml002x7dsz5ymeltop', 'transport', 'vehicle', 'update', 'Edit vehicles');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnmn002y7dszb8itevgb', 'transport', 'driver', 'read', 'View drivers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnmp002z7dszp4dt5iad', 'transport', 'driver', 'create', 'Create driver profiles');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnms00307dsz8ihltwxa', 'transport', 'driver', 'update', 'Edit driver profiles');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnmu00317dszkie2f699', 'transport', 'assignment', 'read', 'View vehicle assignments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnmw00327dsz9ay50k2k', 'transport', 'assignment', 'create', 'Assign vehicles to drivers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnmy00337dsz58b4m7b5', 'transport', 'assignment', 'update', 'Update vehicle assignments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnn100347dszbr95vqus', 'transport', 'trip', 'read', 'View trip orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnn400357dszrv43kasm', 'transport', 'trip', 'create', 'Create trip orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnn600367dsz8vgkb13p', 'transport', 'trip', 'update', 'Edit trip orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnn900377dszstagtjyv', 'transport', 'trip', 'dispatch', 'Dispatch trips');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnnb00387dsz0jade5ps', 'transport', 'trip', 'complete', 'Mark trips as completed');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnnd00397dszw3hxt3de', 'transport', 'trip', 'delete', 'Delete trip orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnnf003a7dszmqoav9ri', 'transport', 'incident', 'read', 'View vehicle incidents');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnnh003b7dszdauazv14', 'transport', 'incident', 'create', 'Report vehicle incidents');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnnj003c7dszq9itc712', 'transport', 'incident', 'update', 'Update incident records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnnl003d7dsz9ibzr91p', 'transport', 'daily-movement', 'read', 'View daily truck movement reports');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnno003e7dszfz78bua8', 'transport', 'daily-movement', 'create', 'Create daily truck movement reports');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnnp003f7dszy0gmresz', 'transport', 'daily-movement', 'update', 'Edit and submit daily truck movement reports');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnns003g7dszhennus56', 'fuel', 'tank', 'read', 'View fuel tanks');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnnu003h7dszzotoslc6', 'fuel', 'tank', 'create', 'Create fuel tanks');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnnw003i7dszh3wwww4l', 'fuel', 'tank', 'update', 'Edit fuel tanks');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnny003j7dszlpf3zivv', 'fuel', 'receipt', 'read', 'View fuel receipts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lno0003k7dszwughlwir', 'fuel', 'receipt', 'create', 'Create fuel receipts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lno2003l7dszt3qnd0kp', 'fuel', 'receipt', 'confirm', 'Confirm fuel receipts into tank');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lno4003m7dszj2isx90z', 'fuel', 'issue', 'read', 'View fuel issues');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lno6003n7dsz4hccpcpz', 'fuel', 'issue', 'create', 'Issue fuel to vehicles');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lno8003o7dszsl7vnhf5', 'fuel', 'price', 'read', 'View fuel prices');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnoa003p7dszgu7v3jqm', 'fuel', 'price', 'create', 'Record fuel prices');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnoc003q7dsztym6xljg', 'fuel', 'report', 'read', 'View fuel consumption reports');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnoe003r7dszahtfdf66', 'maintenance', 'schedule', 'read', 'View maintenance schedules');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnog003s7dszb20gp8yp', 'maintenance', 'schedule', 'create', 'Create maintenance schedules');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnoh003t7dsz92wm28og', 'maintenance', 'schedule', 'update', 'Edit maintenance schedules');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnok003u7dszx6kymzur', 'maintenance', 'workorder', 'read', 'View work orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnom003v7dszoufojvgc', 'maintenance', 'workorder', 'create', 'Create work orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnoo003w7dszc8o90q1l', 'maintenance', 'workorder', 'update', 'Edit work orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnoq003x7dszxb5p60ju', 'maintenance', 'workorder', 'complete', 'Complete work orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnos003y7dsz8candci0', 'maintenance', 'part', 'read', 'View spare parts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnou003z7dsz0gs0saho', 'maintenance', 'part', 'create', 'Create spare parts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnow00407dszl8ut38fc', 'maintenance', 'part', 'update', 'Edit spare parts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnoy00417dsz0v9eilky', 'maintenance', 'receipt', 'read', 'View spare part receipts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnp000427dsz26auqf42', 'maintenance', 'receipt', 'create', 'Receive spare parts into stock');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnp300437dszej4yzecp', 'maintenance', 'report', 'read', 'View maintenance reports');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnp500447dszhfkfnaem', 'procurement', 'supplier', 'read', 'View suppliers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnp700457dszej92j5jk', 'procurement', 'supplier', 'create', 'Create suppliers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnp900467dszs98isnzq', 'procurement', 'supplier', 'update', 'Edit suppliers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnpb00477dszjvllh95f', 'procurement', 'request', 'read', 'View purchase requests');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnpc00487dsz83wo079k', 'procurement', 'request', 'create', 'Create purchase requests');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnpe00497dsznz2uetet', 'procurement', 'request', 'update', 'Edit purchase requests');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnph004a7dsz63qsc140', 'procurement', 'request', 'submit', 'Submit purchase requests');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnpj004b7dszyb3v3uyk', 'procurement', 'request', 'approve', 'Approve purchase requests');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnpm004c7dszzdl9aodr', 'procurement', 'order', 'read', 'View purchase orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnpo004d7dszytwdiqw6', 'procurement', 'order', 'create', 'Create purchase orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnpq004e7dszpzckqpfo', 'procurement', 'order', 'update', 'Edit purchase orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnps004f7dszag9nlgdr', 'procurement', 'order', 'send', 'Send purchase orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnpu004g7dsz1sz3ue0h', 'procurement', 'order', 'receive', 'Receive purchase orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnpw004h7dszlcl5wrxx', 'procurement', 'report', 'read', 'View procurement reports');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnpy004i7dszrz6jbgm0', 'production', 'line', 'read', 'View production lines');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnq0004j7dsz2g0mihhj', 'production', 'line', 'create', 'Create production lines');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnq2004k7dszlkmlms9i', 'production', 'line', 'update', 'Edit production lines');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnq4004l7dszxkhmxpnm', 'production', 'recipe', 'read', 'View production recipes');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnq6004m7dsz7b9x2z6a', 'production', 'recipe', 'create', 'Create production recipes');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnqb004n7dszlbhif6wh', 'production', 'recipe', 'update', 'Edit production recipes');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnqe004o7dszwhi9ajhj', 'production', 'batch', 'read', 'View production batches');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnqg004p7dszwjivjnk1', 'production', 'batch', 'create', 'Create production batches');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnqi004q7dszcgzooqwo', 'production', 'batch', 'update', 'Edit production batches');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnqk004r7dszxqmh72si', 'production', 'batch', 'start', 'Start production batches');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnqm004s7dsz34j5tqcw', 'production', 'batch', 'complete', 'Complete production batches');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnqo004t7dszj6uv86ju', 'production', 'report', 'read', 'View production reports');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnqq004u7dsz0am51ors', 'dispatch', 'product', 'read', 'View finished goods products');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnqs004v7dszvwfepz2s', 'dispatch', 'product', 'create', 'Create finished goods products');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnqu004w7dszsp4rr82m', 'dispatch', 'product', 'update', 'Edit finished goods products');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnqw004x7dszdbbssohx', 'dispatch', 'product', 'delete', 'Delete finished goods products');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnqy004y7dszyml8e5k2', 'dispatch', 'lot', 'read', 'View finished goods inventory lots');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnr0004z7dsz33clwoeq', 'dispatch', 'lot', 'create', 'Receive finished goods inventory lots');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnr300507dsza1urd6e9', 'dispatch', 'lot', 'update', 'Edit finished goods inventory lots');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnr500517dszi8th3451', 'dispatch', 'lot', 'delete', 'Delete finished goods inventory lots');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnr700527dszlse6h1hp', 'dispatch', 'order', 'read', 'View dispatch orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnr900537dsz9e5a4s52', 'dispatch', 'order', 'create', 'Create dispatch orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnrb00547dsz340iqcvw', 'dispatch', 'order', 'update', 'Edit dispatch orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnrd00557dszp6gba4qc', 'dispatch', 'order', 'delete', 'Delete dispatch orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnrf00567dszodlorwra', 'dispatch', 'order', 'dispatch', 'Dispatch orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnri00577dsz44m5vd7p', 'dispatch', 'order', 'deliver', 'Mark dispatch orders delivered');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnrk00587dszrkoi3e65', 'dispatch', 'report', 'read', 'View dispatch reports');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnrm00597dsza5tcey8j', 'finance', 'account', 'read', 'View chart of accounts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnro005a7dszbnnnwnr0', 'finance', 'account', 'create', 'Create accounts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnrr005b7dsz5o7jkref', 'finance', 'account', 'update', 'Edit accounts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnrt005c7dszdjl24s7c', 'finance', 'account', 'deactivate', 'Deactivate accounts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnrv005d7dszp3ry7o4n', 'finance', 'journal', 'read', 'View journal entries');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnrx005e7dsz8j9yr4dg', 'finance', 'journal', 'create', 'Create journal entries');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnrz005f7dszy7r4c8wc', 'finance', 'journal', 'update', 'Edit journal entries');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lns2005g7dszm1dgr2c3', 'finance', 'journal', 'post', 'Post journal entries');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lns4005h7dsz0cabyw3j', 'finance', 'journal', 'reverse', 'Reverse journal entries');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lns6005i7dszfhwaffqz', 'finance', 'bank', 'read', 'View bank accounts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lns9005j7dszdrlf2z4r', 'finance', 'bank', 'create', 'Create bank accounts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnsb005k7dsz9fre8rxg', 'finance', 'bank', 'update', 'Edit bank accounts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnsd005l7dszv35ffwlf', 'finance', 'bank', 'deactivate', 'Deactivate bank accounts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnsg005m7dsznljfclaw', 'finance', 'payment', 'read', 'View payments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnsi005n7dszo1x6e2qh', 'finance', 'payment', 'create', 'Create payments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnsk005o7dszta5djm8f', 'finance', 'payment', 'update', 'Edit payments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnsm005p7dszpv0qromd', 'finance', 'payment', 'complete', 'Complete payments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnso005q7dszswj2zclu', 'finance', 'payment', 'cancel', 'Cancel payments');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnsq005r7dszr8j0zhox', 'finance', 'report', 'read', 'View financial reports');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnss005s7dsz187kvmds', 'analytics', 'dashboard', 'read', 'View analytics dashboard');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnsu005t7dszdezbfxk2', 'analytics', 'operations', 'read', 'View operational analytics');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnsw005u7dsznfyfiue5', 'analytics', 'financial', 'read', 'View financial analytics');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnsz005v7dszbag1vgiv', 'reports', 'report', 'read', 'View module reports');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnt0005w7dsz1e9p9e8d', 'sales', 'customer', 'read', 'View customers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnt2005x7dsz311hxwdm', 'sales', 'customer', 'create', 'Create customers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnt5005y7dsz8j051viy', 'sales', 'customer', 'update', 'Edit customers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnt7005z7dsza5hgoxmx', 'sales', 'order', 'read', 'View sales orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnt900607dsz0ibdtjt9', 'sales', 'order', 'create', 'Create sales orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lntb00617dsz1ihiml6d', 'sales', 'order', 'update', 'Update sales orders');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lntd00627dsz114736mk', 'sales', 'kpi', 'read', 'View sales KPIs');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lntf00637dsz7o6uef1w', 'sales', 'kpi', 'manage', 'Manage sales KPI targets');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnth00647dszzhbg5l8e', 'sales', 'webhook', 'manage', 'Manage sales webhook settings');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lntj00657dszbcj02nc2', 'tra-stamps', 'stamp', 'read', 'View TRA stamps');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lntl00667dszjff5dl42', 'tra-stamps', 'stamp', 'create', 'Receive TRA stamp batches');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lntn00677dszpizgeber', 'tra-stamps', 'stamp', 'activate', 'Activate TRA stamps');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lntr00687dszb9vcnbh8', 'finance', 'cashbook', 'read', 'View cashbook entries');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lntt00697dszli3gc4eh', 'finance', 'cashbook', 'write', 'Create/delete cashbook entries');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lntv006a7dszl1a3guo2', 'finance', 'cashbook', 'director', 'View cross-company cashbook director summary');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnty006b7dszt17zdeuj', 'finance', 'tally', 'read', 'View Tally sync data (vouchers, ledgers, logs)');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnu0006c7dsz1y9umsx9', 'finance', 'tally', 'manage', 'Manage Tally API keys and configuration');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnu4006d7dsz740f5t7l', 'cotton', 'season', 'read', 'View cotton seasons');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnu6006e7dsz69nbwo42', 'cotton', 'season', 'create', 'Create cotton seasons');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnu9006f7dszw3cdyxee', 'cotton', 'season', 'update', 'Update cotton seasons');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnub006g7dsz87koaf6m', 'cotton', 'bale', 'read', 'View cotton bales');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnud006h7dszkqdyq7zm', 'cotton', 'bale', 'create', 'Create cotton bales');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnug006i7dszsgaik3x3', 'cotton', 'bale', 'update', 'Update cotton bales');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnui006j7dsz7foulvan', 'cotton', 'lot', 'read', 'View cotton lots');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnuk006k7dszhskzm4t2', 'cotton', 'lot', 'create', 'Create cotton lots');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnum006l7dszqm197ok0', 'cotton', 'lot', 'update', 'Update cotton lots');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnuo006m7dszbzd0dwei', 'cotton', 'buyer', 'read', 'View cotton buyers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnuq006n7dszvpqo0piz', 'cotton', 'buyer', 'create', 'Create cotton buyers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnus006o7dsz1fme9uwy', 'cotton', 'buyer', 'update', 'Update cotton buyers');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnuv006p7dszkgrg7895', 'cotton', 'contract', 'read', 'View cotton contracts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnux006q7dsz4wa6sjo2', 'cotton', 'contract', 'create', 'Create cotton contracts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnuz006r7dsz6myv7676', 'cotton', 'contract', 'update', 'Update cotton contracts');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnv1006s7dszeak7a3zv', 'cotton', 'invoice', 'read', 'View cotton invoices');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnv3006t7dszh99u7vv1', 'cotton', 'invoice', 'create', 'Create cotton invoices');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnv5006u7dszw02n8c2n', 'cotton', 'invoice', 'update', 'Update cotton invoices');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnv7006v7dszgtnvm2zo', 'company', 'company', 'switch', 'Switch between companies');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnv9006w7dsznjw9yyzw', 'brewing', 'session', 'read', 'View mashing/brewing session records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnvc006x7dszhequi094', 'brewing', 'session', 'write', 'Create/edit mashing/brewing session records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnve006y7dszf6ntd3h4', 'brewing', 'material', 'read', 'View brewhouse material usage records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnvg006z7dsz6is4welw', 'brewing', 'material', 'write', 'Create/edit brewhouse material usage records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnvj00707dsznt1xx4bu', 'brewing', 'cip', 'read', 'View CIP cleaning records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnvm00717dszkir8e37g', 'brewing', 'cip', 'write', 'Create/edit CIP cleaning records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnvo00727dsz9cgrzo88', 'lab', 'unitank', 'read', 'View unitank analysis records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnvr00737dsz2qcfgx3g', 'lab', 'unitank', 'write', 'Create/edit unitank analysis records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnvu00747dszjupb0ugx', 'lab', 'bbt', 'read', 'View BBT analysis records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnvw00757dszahljtppj', 'lab', 'bbt', 'write', 'Create/edit BBT analysis records');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnvy00767dsz5bhy25fr', 'lab', 'micro', 'read', 'View daily micro reports');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnw000777dszyrm0z54g', 'lab', 'micro', 'write', 'Create/edit daily micro reports');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnw200787dszxavwwd7q', 'lab', 'spec', 'read', 'View packaged product specs');
INSERT INTO "permissions" ("id", "module", "resource", "action", "description") VALUES ('cmt38lnw300797dsz9rjbznvo', 'lab', 'spec', 'write', 'Create/edit packaged product specs');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnit00147dszsed94xm7', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lniy00157dsz50isxrbp', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnj000167dszzeqkzek2', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnj200177dszi2cc9pdo', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnj400187dszyyqz6ce0', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnj600197dszaeruwfyp', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnj8001a7dszljbj66vc', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnja001b7dszhewy4asx', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnjc001c7dsz1i7ph2au', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnje001d7dsz3ov3mfvf', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnjg001e7dszbg6wpygt', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnji001f7dszrh9j3hfa', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnjk001g7dsz1biaq1yg', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnjm001h7dszolxn5gyl', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnjn001i7dszn2i8qqvq', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnjp001j7dsz7btd1l02', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnjr001k7dszxfpzz742', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnjt001l7dsz1774q0t9', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnjv001m7dszghnkwy4c', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnjy001n7dszcr4xjej4', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnk0001o7dsz8b44cu9v', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnk2001p7dszagsyp8ig', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnk4001q7dszna65gp4s', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnk6001r7dszyfdygiyt', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnk8001s7dszq1bweuk6', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnka001t7dsztknnnggz', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnkc001u7dszj8nipvgp', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnke001v7dsz8zta6do7', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnkg001w7dszea1kqz3j', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnkj001x7dszvtmz83rp', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnkl001y7dsz2z9b7x8d', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnkn001z7dszt98o00x3', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnkp00207dsz544on4ci', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnkr00217dszqb1hfqmt', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnkt00227dszzw739r27', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnkv00237dsze5jacyh9', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnkx00247dszicdzmbui', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnkz00257dszdh96fqhf', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnl100267dszdweshwek', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnl300277dsz9xisv2xi', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnl500287dszuugc0mfx', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnl700297dszngazrsrr', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnl9002a7dszb4tcykdv', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnlb002b7dszoqpf316i', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnld002c7dszv1nyguqx', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnlf002d7dszl6c7a3li', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnlh002e7dszfjkn2gp1', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnlj002f7dszajjm1cl1', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnll002g7dszwludlmw1', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnln002h7dszjw72c3rx', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnlq002i7dszfxyohwdv', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnlr002j7dszrhfgf1p9', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnlu002k7dsz3x9u8bdt', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnlv002l7dsz74z1bxuo', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnly002m7dszlpkdtxr2', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnm0002n7dszc1uggs6u', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnm2002o7dszhxupvg0q', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnm4002p7dszc614z9hc', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnm6002q7dszsne3409z', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnm8002r7dszpdo6ulqo', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnma002s7dszlgtsrcaf', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnmc002t7dsz6fyeypbh', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnme002u7dszl62m1d64', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnmg002v7dsz72eyi6hc', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnmi002w7dszsagbhril', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnml002x7dsz5ymeltop', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnmn002y7dszb8itevgb', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnmp002z7dszp4dt5iad', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnms00307dsz8ihltwxa', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnmu00317dszkie2f699', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnmw00327dsz9ay50k2k', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnmy00337dsz58b4m7b5', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnn100347dszbr95vqus', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnn400357dszrv43kasm', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnn600367dsz8vgkb13p', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnn900377dszstagtjyv', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnnb00387dsz0jade5ps', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnnd00397dszw3hxt3de', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnnf003a7dszmqoav9ri', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnnh003b7dszdauazv14', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnnj003c7dszq9itc712', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnnl003d7dsz9ibzr91p', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnno003e7dszfz78bua8', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnnp003f7dszy0gmresz', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnns003g7dszhennus56', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnnu003h7dszzotoslc6', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnnw003i7dszh3wwww4l', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnny003j7dszlpf3zivv', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lno0003k7dszwughlwir', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lno2003l7dszt3qnd0kp', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lno4003m7dszj2isx90z', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lno6003n7dsz4hccpcpz', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lno8003o7dszsl7vnhf5', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnoa003p7dszgu7v3jqm', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnoc003q7dsztym6xljg', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnoe003r7dszahtfdf66', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnog003s7dszb20gp8yp', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnoh003t7dsz92wm28og', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnok003u7dszx6kymzur', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnom003v7dszoufojvgc', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnoo003w7dszc8o90q1l', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnoq003x7dszxb5p60ju', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnos003y7dsz8candci0', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnou003z7dsz0gs0saho', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnow00407dszl8ut38fc', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnoy00417dsz0v9eilky', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnp000427dsz26auqf42', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnp300437dszej4yzecp', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnp500447dszhfkfnaem', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnp700457dszej92j5jk', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnp900467dszs98isnzq', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnpb00477dszjvllh95f', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnpc00487dsz83wo079k', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnpe00497dsznz2uetet', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnph004a7dsz63qsc140', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnpj004b7dszyb3v3uyk', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnpm004c7dszzdl9aodr', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnpo004d7dszytwdiqw6', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnpq004e7dszpzckqpfo', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnps004f7dszag9nlgdr', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnpu004g7dsz1sz3ue0h', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnpw004h7dszlcl5wrxx', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnpy004i7dszrz6jbgm0', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnq0004j7dsz2g0mihhj', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnq2004k7dszlkmlms9i', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnq4004l7dszxkhmxpnm', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnq6004m7dsz7b9x2z6a', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnqb004n7dszlbhif6wh', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnqe004o7dszwhi9ajhj', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnqg004p7dszwjivjnk1', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnqi004q7dszcgzooqwo', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnqk004r7dszxqmh72si', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnqm004s7dsz34j5tqcw', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnqo004t7dszj6uv86ju', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnqq004u7dsz0am51ors', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnqs004v7dszvwfepz2s', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnqu004w7dszsp4rr82m', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnqw004x7dszdbbssohx', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnqy004y7dszyml8e5k2', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnr0004z7dsz33clwoeq', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnr300507dsza1urd6e9', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnr500517dszi8th3451', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnr700527dszlse6h1hp', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnr900537dsz9e5a4s52', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnrb00547dsz340iqcvw', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnrd00557dszp6gba4qc', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnrf00567dszodlorwra', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnri00577dsz44m5vd7p', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnrk00587dszrkoi3e65', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnrm00597dsza5tcey8j', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnro005a7dszbnnnwnr0', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnrr005b7dsz5o7jkref', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnrt005c7dszdjl24s7c', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnrv005d7dszp3ry7o4n', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnrx005e7dsz8j9yr4dg', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnrz005f7dszy7r4c8wc', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lns2005g7dszm1dgr2c3', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lns4005h7dsz0cabyw3j', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lns6005i7dszfhwaffqz', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lns9005j7dszdrlf2z4r', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnsb005k7dsz9fre8rxg', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnsd005l7dszv35ffwlf', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnsg005m7dsznljfclaw', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnsi005n7dszo1x6e2qh', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnsk005o7dszta5djm8f', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnsm005p7dszpv0qromd', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnso005q7dszswj2zclu', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnsq005r7dszr8j0zhox', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnss005s7dsz187kvmds', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnsu005t7dszdezbfxk2', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnsw005u7dsznfyfiue5', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnsz005v7dszbag1vgiv', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnt0005w7dsz1e9p9e8d', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnt2005x7dsz311hxwdm', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnt5005y7dsz8j051viy', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnt7005z7dsza5hgoxmx', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnt900607dsz0ibdtjt9', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lntb00617dsz1ihiml6d', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lntd00627dsz114736mk', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lntf00637dsz7o6uef1w', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnth00647dszzhbg5l8e', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lntj00657dszbcj02nc2', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lntl00667dszjff5dl42', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lntn00677dszpizgeber', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lntr00687dszb9vcnbh8', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lntt00697dszli3gc4eh', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lntv006a7dszl1a3guo2', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnty006b7dszt17zdeuj', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnu0006c7dsz1y9umsx9', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnu4006d7dsz740f5t7l', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnu6006e7dsz69nbwo42', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnu9006f7dszw3cdyxee', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnub006g7dsz87koaf6m', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnud006h7dszkqdyq7zm', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnug006i7dszsgaik3x3', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnui006j7dsz7foulvan', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnuk006k7dszhskzm4t2', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnum006l7dszqm197ok0', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnuo006m7dszbzd0dwei', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnuq006n7dszvpqo0piz', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnus006o7dsz1fme9uwy', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnuv006p7dszkgrg7895', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnux006q7dsz4wa6sjo2', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnuz006r7dsz6myv7676', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnv1006s7dszeak7a3zv', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnv3006t7dszh99u7vv1', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnv5006u7dszw02n8c2n', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnv7006v7dszgtnvm2zo', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnv9006w7dsznjw9yyzw', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnvc006x7dszhequi094', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnve006y7dszf6ntd3h4', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnvg006z7dsz6is4welw', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnvj00707dsznt1xx4bu', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnvm00717dszkir8e37g', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnvo00727dsz9cgrzo88', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnvr00737dsz2qcfgx3g', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnvu00747dszjupb0ugx', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnvw00757dszahljtppj', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnvy00767dsz5bhy25fr', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnw000777dszyrm0z54g', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnw200787dszxavwwd7q', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw6007a7dsz8g1wmr5c', 'cmt38lnw300797dsz9rjbznvo', '2026-08-21T17:42:24.080+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnit00147dszsed94xm7', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lniy00157dsz50isxrbp', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnj000167dszzeqkzek2', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnj200177dszi2cc9pdo', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnj400187dszyyqz6ce0', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnj600197dszaeruwfyp', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnj8001a7dszljbj66vc', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnja001b7dszhewy4asx', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnjc001c7dsz1i7ph2au', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnje001d7dsz3ov3mfvf', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnjg001e7dszbg6wpygt', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnji001f7dszrh9j3hfa', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnjk001g7dsz1biaq1yg', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnjm001h7dszolxn5gyl', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnjn001i7dszn2i8qqvq', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnv7006v7dszgtnvm2zo', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnjp001j7dsz7btd1l02', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnjr001k7dszxfpzz742', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnjt001l7dsz1774q0t9', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnjv001m7dszghnkwy4c', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnjy001n7dszcr4xjej4', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnk0001o7dsz8b44cu9v', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnk2001p7dszagsyp8ig', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnk4001q7dszna65gp4s', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnk6001r7dszyfdygiyt', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnk8001s7dszq1bweuk6', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnka001t7dsztknnnggz', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnkc001u7dszj8nipvgp', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnke001v7dsz8zta6do7', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnkg001w7dszea1kqz3j', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnkj001x7dszvtmz83rp', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnkl001y7dsz2z9b7x8d', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnkn001z7dszt98o00x3', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnkp00207dsz544on4ci', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnkr00217dszqb1hfqmt', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnkt00227dszzw739r27', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnkv00237dsze5jacyh9', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnkx00247dszicdzmbui', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnkz00257dszdh96fqhf', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnl100267dszdweshwek', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnl300277dsz9xisv2xi', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnl500287dszuugc0mfx', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnl700297dszngazrsrr', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnl9002a7dszb4tcykdv', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnlb002b7dszoqpf316i', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnld002c7dszv1nyguqx', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnlf002d7dszl6c7a3li', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnlh002e7dszfjkn2gp1', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnlj002f7dszajjm1cl1', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnll002g7dszwludlmw1', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnln002h7dszjw72c3rx', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnlq002i7dszfxyohwdv', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnlr002j7dszrhfgf1p9', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnlu002k7dsz3x9u8bdt', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnlv002l7dsz74z1bxuo', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnly002m7dszlpkdtxr2', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnm0002n7dszc1uggs6u', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnm2002o7dszhxupvg0q', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnm4002p7dszc614z9hc', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnm6002q7dszsne3409z', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnm8002r7dszpdo6ulqo', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnma002s7dszlgtsrcaf', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnmc002t7dsz6fyeypbh', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnme002u7dszl62m1d64', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnmg002v7dsz72eyi6hc', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnmi002w7dszsagbhril', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnml002x7dsz5ymeltop', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnmn002y7dszb8itevgb', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnmp002z7dszp4dt5iad', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnms00307dsz8ihltwxa', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnmu00317dszkie2f699', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnmw00327dsz9ay50k2k', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnmy00337dsz58b4m7b5', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnn100347dszbr95vqus', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnn400357dszrv43kasm', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnn600367dsz8vgkb13p', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnn900377dszstagtjyv', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnnb00387dsz0jade5ps', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnnd00397dszw3hxt3de', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnnf003a7dszmqoav9ri', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnnh003b7dszdauazv14', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnnj003c7dszq9itc712', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnnl003d7dsz9ibzr91p', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnno003e7dszfz78bua8', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnnp003f7dszy0gmresz', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnns003g7dszhennus56', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnnu003h7dszzotoslc6', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnnw003i7dszh3wwww4l', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnny003j7dszlpf3zivv', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lno0003k7dszwughlwir', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lno2003l7dszt3qnd0kp', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lno4003m7dszj2isx90z', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lno6003n7dsz4hccpcpz', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lno8003o7dszsl7vnhf5', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnoa003p7dszgu7v3jqm', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnoc003q7dsztym6xljg', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnoe003r7dszahtfdf66', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnog003s7dszb20gp8yp', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnoh003t7dsz92wm28og', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnok003u7dszx6kymzur', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnom003v7dszoufojvgc', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnoo003w7dszc8o90q1l', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnoq003x7dszxb5p60ju', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnos003y7dsz8candci0', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnou003z7dsz0gs0saho', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnow00407dszl8ut38fc', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnoy00417dsz0v9eilky', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnp000427dsz26auqf42', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnp300437dszej4yzecp', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnp500447dszhfkfnaem', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnp700457dszej92j5jk', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnp900467dszs98isnzq', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnpb00477dszjvllh95f', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnpc00487dsz83wo079k', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnpe00497dsznz2uetet', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnph004a7dsz63qsc140', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnpj004b7dszyb3v3uyk', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnpm004c7dszzdl9aodr', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnpo004d7dszytwdiqw6', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnpq004e7dszpzckqpfo', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnps004f7dszag9nlgdr', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnpu004g7dsz1sz3ue0h', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnpw004h7dszlcl5wrxx', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnpy004i7dszrz6jbgm0', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnq0004j7dsz2g0mihhj', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnq2004k7dszlkmlms9i', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnq4004l7dszxkhmxpnm', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnq6004m7dsz7b9x2z6a', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnqb004n7dszlbhif6wh', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnqe004o7dszwhi9ajhj', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnqg004p7dszwjivjnk1', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnqi004q7dszcgzooqwo', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnqk004r7dszxqmh72si', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnqm004s7dsz34j5tqcw', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnqo004t7dszj6uv86ju', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnqq004u7dsz0am51ors', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnqs004v7dszvwfepz2s', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnqu004w7dszsp4rr82m', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnqw004x7dszdbbssohx', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnqy004y7dszyml8e5k2', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnr0004z7dsz33clwoeq', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnr300507dsza1urd6e9', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnr500517dszi8th3451', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnr700527dszlse6h1hp', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnr900537dsz9e5a4s52', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnrb00547dsz340iqcvw', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnrd00557dszp6gba4qc', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnrf00567dszodlorwra', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnri00577dsz44m5vd7p', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnrk00587dszrkoi3e65', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnrm00597dsza5tcey8j', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnro005a7dszbnnnwnr0', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnrr005b7dsz5o7jkref', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnrt005c7dszdjl24s7c', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnrv005d7dszp3ry7o4n', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnrx005e7dsz8j9yr4dg', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnrz005f7dszy7r4c8wc', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lns2005g7dszm1dgr2c3', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lns4005h7dsz0cabyw3j', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lns6005i7dszfhwaffqz', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lns9005j7dszdrlf2z4r', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnsb005k7dsz9fre8rxg', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnsd005l7dszv35ffwlf', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnsg005m7dsznljfclaw', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnsi005n7dszo1x6e2qh', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnsk005o7dszta5djm8f', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnsm005p7dszpv0qromd', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnso005q7dszswj2zclu', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lntr00687dszb9vcnbh8', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lntt00697dszli3gc4eh', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lntv006a7dszl1a3guo2', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnsq005r7dszr8j0zhox', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnss005s7dsz187kvmds', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnsu005t7dszdezbfxk2', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnsw005u7dsznfyfiue5', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnsz005v7dszbag1vgiv', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lntj00657dszbcj02nc2', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lntl00667dszjff5dl42', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lntn00677dszpizgeber', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnty006b7dszt17zdeuj', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnu0006c7dsz1y9umsx9', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnu4006d7dsz740f5t7l', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnu6006e7dsz69nbwo42', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnu9006f7dszw3cdyxee', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnub006g7dsz87koaf6m', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnud006h7dszkqdyq7zm', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnug006i7dszsgaik3x3', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnui006j7dsz7foulvan', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnuk006k7dszhskzm4t2', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnum006l7dszqm197ok0', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnuo006m7dszbzd0dwei', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnuq006n7dszvpqo0piz', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnus006o7dsz1fme9uwy', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnuv006p7dszkgrg7895', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnux006q7dsz4wa6sjo2', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnuz006r7dsz6myv7676', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnv1006s7dszeak7a3zv', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnv3006t7dszh99u7vv1', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnv5006u7dszw02n8c2n', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnv9006w7dsznjw9yyzw', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnvc006x7dszhequi094', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnve006y7dszf6ntd3h4', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnvg006z7dsz6is4welw', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnvj00707dsznt1xx4bu', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnvm00717dszkir8e37g', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnvo00727dsz9cgrzo88', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnvr00737dsz2qcfgx3g', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnvu00747dszjupb0ugx', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnvw00757dszahljtppj', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnvy00767dsz5bhy25fr', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnw000777dszyrm0z54g', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnw200787dszxavwwd7q', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnw9007b7dszdazyaom3', 'cmt38lnw300797dsz9rjbznvo', '2026-08-21T17:42:24.097+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnit00147dszsed94xm7', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnj000167dszzeqkzek2', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnjc001c7dsz1i7ph2au', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnjm001h7dszolxn5gyl', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnv7006v7dszgtnvm2zo', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnjr001k7dszxfpzz742', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnjt001l7dsz1774q0t9', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnjy001n7dszcr4xjej4', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnk0001o7dsz8b44cu9v', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnk2001p7dszagsyp8ig', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnk4001q7dszna65gp4s', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnk6001r7dszyfdygiyt', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnk8001s7dszq1bweuk6', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnka001t7dsztknnnggz', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnkn001z7dszt98o00x3', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnkp00207dsz544on4ci', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnkt00227dszzw739r27', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnkv00237dsze5jacyh9', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnkx00247dszicdzmbui', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnkz00257dszdh96fqhf', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnl100267dszdweshwek', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnl300277dsz9xisv2xi', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnl500287dszuugc0mfx', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnl700297dszngazrsrr', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnl9002a7dszb4tcykdv', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnlb002b7dszoqpf316i', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnlh002e7dszfjkn2gp1', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnln002h7dszjw72c3rx', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnlq002i7dszfxyohwdv', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnlr002j7dszrhfgf1p9', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnlu002k7dsz3x9u8bdt', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnlv002l7dsz74z1bxuo', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnly002m7dszlpkdtxr2', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnm0002n7dszc1uggs6u', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnm2002o7dszhxupvg0q', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnm4002p7dszc614z9hc', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnm6002q7dszsne3409z', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnm8002r7dszpdo6ulqo', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnma002s7dszlgtsrcaf', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnmc002t7dsz6fyeypbh', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnme002u7dszl62m1d64', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnmg002v7dsz72eyi6hc', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnmi002w7dszsagbhril', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnml002x7dsz5ymeltop', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnmn002y7dszb8itevgb', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnmp002z7dszp4dt5iad', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnms00307dsz8ihltwxa', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnmu00317dszkie2f699', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnmw00327dsz9ay50k2k', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnmy00337dsz58b4m7b5', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnn100347dszbr95vqus', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnn400357dszrv43kasm', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnn600367dsz8vgkb13p', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnn900377dszstagtjyv', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnnb00387dsz0jade5ps', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnnd00397dszw3hxt3de', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnnf003a7dszmqoav9ri', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnnh003b7dszdauazv14', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnnj003c7dszq9itc712', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnnl003d7dsz9ibzr91p', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnno003e7dszfz78bua8', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnnp003f7dszy0gmresz', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnns003g7dszhennus56', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnnu003h7dszzotoslc6', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnnw003i7dszh3wwww4l', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnny003j7dszlpf3zivv', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lno0003k7dszwughlwir', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lno2003l7dszt3qnd0kp', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lno4003m7dszj2isx90z', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lno6003n7dsz4hccpcpz', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lno8003o7dszsl7vnhf5', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnoa003p7dszgu7v3jqm', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnoc003q7dsztym6xljg', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnoe003r7dszahtfdf66', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnog003s7dszb20gp8yp', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnoh003t7dsz92wm28og', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnok003u7dszx6kymzur', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnom003v7dszoufojvgc', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnoo003w7dszc8o90q1l', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnoq003x7dszxb5p60ju', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnos003y7dsz8candci0', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnou003z7dsz0gs0saho', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnow00407dszl8ut38fc', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnoy00417dsz0v9eilky', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnp000427dsz26auqf42', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnp300437dszej4yzecp', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnp500447dszhfkfnaem', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnp700457dszej92j5jk', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnp900467dszs98isnzq', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnpb00477dszjvllh95f', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnpc00487dsz83wo079k', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnpe00497dsznz2uetet', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnph004a7dsz63qsc140', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnpj004b7dszyb3v3uyk', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnpm004c7dszzdl9aodr', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnpo004d7dszytwdiqw6', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnpq004e7dszpzckqpfo', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnps004f7dszag9nlgdr', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnpu004g7dsz1sz3ue0h', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnpw004h7dszlcl5wrxx', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnpy004i7dszrz6jbgm0', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnq0004j7dsz2g0mihhj', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnq2004k7dszlkmlms9i', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnq4004l7dszxkhmxpnm', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnq6004m7dsz7b9x2z6a', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnqb004n7dszlbhif6wh', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnqe004o7dszwhi9ajhj', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnqg004p7dszwjivjnk1', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnqi004q7dszcgzooqwo', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnqk004r7dszxqmh72si', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnqm004s7dsz34j5tqcw', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnqo004t7dszj6uv86ju', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnqq004u7dsz0am51ors', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnqs004v7dszvwfepz2s', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnqu004w7dszsp4rr82m', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnqw004x7dszdbbssohx', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnqy004y7dszyml8e5k2', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnr0004z7dsz33clwoeq', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnr300507dsza1urd6e9', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnr500517dszi8th3451', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnr700527dszlse6h1hp', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnr900537dsz9e5a4s52', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnrb00547dsz340iqcvw', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnrd00557dszp6gba4qc', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnrf00567dszodlorwra', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnri00577dsz44m5vd7p', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnrk00587dszrkoi3e65', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnrm00597dsza5tcey8j', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnro005a7dszbnnnwnr0', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnrr005b7dsz5o7jkref', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnrv005d7dszp3ry7o4n', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnrx005e7dsz8j9yr4dg', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnrz005f7dszy7r4c8wc', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lns6005i7dszfhwaffqz', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lns9005j7dszdrlf2z4r', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnsb005k7dsz9fre8rxg', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnsg005m7dsznljfclaw', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnsi005n7dszo1x6e2qh', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnsk005o7dszta5djm8f', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnsm005p7dszpv0qromd', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lntr00687dszb9vcnbh8', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lntt00697dszli3gc4eh', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnsq005r7dszr8j0zhox', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnss005s7dsz187kvmds', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnsu005t7dszdezbfxk2', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnsz005v7dszbag1vgiv', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lntj00657dszbcj02nc2', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lntl00667dszjff5dl42', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lntn00677dszpizgeber', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnu4006d7dsz740f5t7l', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnu6006e7dsz69nbwo42', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnu9006f7dszw3cdyxee', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnub006g7dsz87koaf6m', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnud006h7dszkqdyq7zm', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnug006i7dszsgaik3x3', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnui006j7dsz7foulvan', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnuk006k7dszhskzm4t2', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnum006l7dszqm197ok0', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnuo006m7dszbzd0dwei', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnuq006n7dszvpqo0piz', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnus006o7dsz1fme9uwy', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnuv006p7dszkgrg7895', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnux006q7dsz4wa6sjo2', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnuz006r7dsz6myv7676', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnv1006s7dszeak7a3zv', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnv3006t7dszh99u7vv1', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnv5006u7dszw02n8c2n', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnv9006w7dsznjw9yyzw', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnvc006x7dszhequi094', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnve006y7dszf6ntd3h4', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnvg006z7dsz6is4welw', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnvj00707dsznt1xx4bu', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnvm00717dszkir8e37g', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnvo00727dsz9cgrzo88', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnvr00737dsz2qcfgx3g', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnvu00747dszjupb0ugx', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnvw00757dszahljtppj', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnvy00767dsz5bhy25fr', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnw000777dszyrm0z54g', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnw200787dszxavwwd7q', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwc007c7dsz1aqgd4ed', 'cmt38lnw300797dsz9rjbznvo', '2026-08-21T17:42:24.109+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnit00147dszsed94xm7', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnj000167dszzeqkzek2', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnjm001h7dszolxn5gyl', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnjr001k7dszxfpzz742', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnk0001o7dsz8b44cu9v', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnk2001p7dszagsyp8ig', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnk8001s7dszq1bweuk6', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnkn001z7dszt98o00x3', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnkp00207dsz544on4ci', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnkt00227dszzw739r27', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnkz00257dszdh96fqhf', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnl500287dszuugc0mfx', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnlb002b7dszoqpf316i', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnlh002e7dszfjkn2gp1', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnln002h7dszjw72c3rx', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnlq002i7dszfxyohwdv', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnlr002j7dszrhfgf1p9', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnlv002l7dsz74z1bxuo', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnly002m7dszlpkdtxr2', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnm4002p7dszc614z9hc', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnm6002q7dszsne3409z', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnm8002r7dszpdo6ulqo', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnmc002t7dsz6fyeypbh', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnme002u7dszl62m1d64', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnmg002v7dsz72eyi6hc', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnmn002y7dszb8itevgb', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnmu00317dszkie2f699', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnn100347dszbr95vqus', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnn400357dszrv43kasm', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnn600367dsz8vgkb13p', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnn900377dszstagtjyv', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnnf003a7dszmqoav9ri', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnnh003b7dszdauazv14', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnnl003d7dsz9ibzr91p', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnno003e7dszfz78bua8', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnnp003f7dszy0gmresz', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnns003g7dszhennus56', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnny003j7dszlpf3zivv', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lno4003m7dszj2isx90z', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lno6003n7dsz4hccpcpz', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lno8003o7dszsl7vnhf5', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnoc003q7dsztym6xljg', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnoe003r7dszahtfdf66', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnok003u7dszx6kymzur', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnom003v7dszoufojvgc', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnoo003w7dszc8o90q1l', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnos003y7dsz8candci0', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnoy00417dsz0v9eilky', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnp000427dsz26auqf42', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnp300437dszej4yzecp', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnp500447dszhfkfnaem', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnpb00477dszjvllh95f', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnpc00487dsz83wo079k', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnpe00497dsznz2uetet', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnph004a7dsz63qsc140', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnpm004c7dszzdl9aodr', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnpw004h7dszlcl5wrxx', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnpy004i7dszrz6jbgm0', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnq4004l7dszxkhmxpnm', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnqe004o7dszwhi9ajhj', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnqg004p7dszwjivjnk1', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnqi004q7dszcgzooqwo', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnqk004r7dszxqmh72si', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnqm004s7dsz34j5tqcw', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnqo004t7dszj6uv86ju', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnqq004u7dsz0am51ors', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnqs004v7dszvwfepz2s', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnqy004y7dszyml8e5k2', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnr0004z7dsz33clwoeq', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnr300507dsza1urd6e9', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnr700527dszlse6h1hp', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnr900537dsz9e5a4s52', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnrb00547dsz340iqcvw', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnrf00567dszodlorwra', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnri00577dsz44m5vd7p', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnrk00587dszrkoi3e65', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnrm00597dsza5tcey8j', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnro005a7dszbnnnwnr0', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnrv005d7dszp3ry7o4n', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnrx005e7dsz8j9yr4dg', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lns6005i7dszfhwaffqz', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lns9005j7dszdrlf2z4r', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnsg005m7dsznljfclaw', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnsi005n7dszo1x6e2qh', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnsq005r7dszr8j0zhox', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnss005s7dsz187kvmds', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnsu005t7dszdezbfxk2', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnsw005u7dsznfyfiue5', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnsz005v7dszbag1vgiv', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lntr00687dszb9vcnbh8', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lntt00697dszli3gc4eh', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lntj00657dszbcj02nc2', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnv9006w7dsznjw9yyzw', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnvc006x7dszhequi094', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnve006y7dszf6ntd3h4', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnvg006z7dsz6is4welw', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnvj00707dsznt1xx4bu', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnvm00717dszkir8e37g', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnvo00727dsz9cgrzo88', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnvr00737dsz2qcfgx3g', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnvu00747dszjupb0ugx', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnvw00757dszahljtppj', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnvy00767dsz5bhy25fr', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnw000777dszyrm0z54g', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnw200787dszxavwwd7q', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwe007d7dszxybcu0e9', 'cmt38lnw300797dsz9rjbznvo', '2026-08-21T17:42:24.120+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnit00147dszsed94xm7', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnj000167dszzeqkzek2', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnjm001h7dszolxn5gyl', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnjr001k7dszxfpzz742', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnk0001o7dsz8b44cu9v', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnk8001s7dszq1bweuk6', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnkj001x7dszvtmz83rp', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnkn001z7dszt98o00x3', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnkp00207dsz544on4ci', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnkt00227dszzw739r27', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnkz00257dszdh96fqhf', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnl500287dszuugc0mfx', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnlb002b7dszoqpf316i', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnlh002e7dszfjkn2gp1', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnln002h7dszjw72c3rx', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnlq002i7dszfxyohwdv', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnlv002l7dsz74z1bxuo', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnm4002p7dszc614z9hc', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnmc002t7dsz6fyeypbh', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnmg002v7dsz72eyi6hc', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnmn002y7dszb8itevgb', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnn100347dszbr95vqus', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnnf003a7dszmqoav9ri', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnnl003d7dsz9ibzr91p', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnns003g7dszhennus56', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnny003j7dszlpf3zivv', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lno4003m7dszj2isx90z', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lno8003o7dszsl7vnhf5', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnoc003q7dsztym6xljg', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnoe003r7dszahtfdf66', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnok003u7dszx6kymzur', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnos003y7dsz8candci0', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnp300437dszej4yzecp', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnp500447dszhfkfnaem', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnpb00477dszjvllh95f', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnpj004b7dszyb3v3uyk', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnpm004c7dszzdl9aodr', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnpw004h7dszlcl5wrxx', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnpy004i7dszrz6jbgm0', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnq4004l7dszxkhmxpnm', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnqe004o7dszwhi9ajhj', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnqo004t7dszj6uv86ju', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnqq004u7dsz0am51ors', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnqy004y7dszyml8e5k2', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnr700527dszlse6h1hp', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnrf00567dszodlorwra', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnri00577dsz44m5vd7p', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnrk00587dszrkoi3e65', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnrm00597dsza5tcey8j', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnrv005d7dszp3ry7o4n', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lns6005i7dszfhwaffqz', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnsg005m7dsznljfclaw', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lntr00687dszb9vcnbh8', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lntv006a7dszl1a3guo2', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnsq005r7dszr8j0zhox', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnss005s7dsz187kvmds', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnsu005t7dszdezbfxk2', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnsw005u7dsznfyfiue5', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnsz005v7dszbag1vgiv', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lntj00657dszbcj02nc2', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnu4006d7dsz740f5t7l', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnub006g7dsz87koaf6m', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnui006j7dsz7foulvan', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnuo006m7dszbzd0dwei', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnuv006p7dszkgrg7895', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnv1006s7dszeak7a3zv', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnv9006w7dsznjw9yyzw', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnve006y7dszf6ntd3h4', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnvj00707dsznt1xx4bu', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnvo00727dsz9cgrzo88', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnvu00747dszjupb0ugx', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnvy00767dsz5bhy25fr', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwj007f7dszuq7mdbgw', 'cmt38lnw200787dszxavwwd7q', '2026-08-21T17:42:24.128+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnit00147dszsed94xm7', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnjm001h7dszolxn5gyl', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnjr001k7dszxfpzz742', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnk0001o7dsz8b44cu9v', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnk8001s7dszq1bweuk6', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnj000167dszzeqkzek2', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnkj001x7dszvtmz83rp', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnkp00207dsz544on4ci', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnkn001z7dszt98o00x3', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnrm00597dsza5tcey8j', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnrv005d7dszp3ry7o4n', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lns6005i7dszfhwaffqz', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnsg005m7dsznljfclaw', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lntr00687dszb9vcnbh8', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lntv006a7dszl1a3guo2', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnsq005r7dszr8j0zhox', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnty006b7dszt17zdeuj', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnkt00227dszzw739r27', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnl500287dszuugc0mfx', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnln002h7dszjw72c3rx', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnlq002i7dszfxyohwdv', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnlv002l7dsz74z1bxuo', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnmg002v7dsz72eyi6hc', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnn100347dszbr95vqus', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnns003g7dszhennus56', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnny003j7dszlpf3zivv', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lno4003m7dszj2isx90z', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnoc003q7dsztym6xljg', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnok003u7dszx6kymzur', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnp300437dszej4yzecp', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnp500447dszhfkfnaem', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnpb00477dszjvllh95f', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnpm004c7dszzdl9aodr', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnpw004h7dszlcl5wrxx', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnpy004i7dszrz6jbgm0', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnq4004l7dszxkhmxpnm', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnqe004o7dszwhi9ajhj', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnqo004t7dszj6uv86ju', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnqq004u7dsz0am51ors', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnqy004y7dszyml8e5k2', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnr700527dszlse6h1hp', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnrk00587dszrkoi3e65', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnu4006d7dsz740f5t7l', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnub006g7dsz87koaf6m', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnui006j7dsz7foulvan', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnuo006m7dszbzd0dwei', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnuv006p7dszkgrg7895', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnv1006s7dszeak7a3zv', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnss005s7dsz187kvmds', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnsu005t7dszdezbfxk2', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnsw005u7dsznfyfiue5', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwh007e7dszusrmi7wf', 'cmt38lnsz005v7dszbag1vgiv', '2026-08-21T17:42:24.137+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnit00147dszsed94xm7', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnj000167dszzeqkzek2', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnjc001c7dsz1i7ph2au', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnjm001h7dszolxn5gyl', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnjr001k7dszxfpzz742', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnk0001o7dsz8b44cu9v', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnk8001s7dszq1bweuk6', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnkj001x7dszvtmz83rp', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnkp00207dsz544on4ci', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnkt00227dszzw739r27', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnkz00257dszdh96fqhf', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnl500287dszuugc0mfx', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnlb002b7dszoqpf316i', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnlh002e7dszfjkn2gp1', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnln002h7dszjw72c3rx', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnlq002i7dszfxyohwdv', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnlv002l7dsz74z1bxuo', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnm4002p7dszc614z9hc', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnmc002t7dsz6fyeypbh', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnmg002v7dsz72eyi6hc', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnmn002y7dszb8itevgb', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnn100347dszbr95vqus', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnnf003a7dszmqoav9ri', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnnl003d7dsz9ibzr91p', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnns003g7dszhennus56', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnny003j7dszlpf3zivv', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lno4003m7dszj2isx90z', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lno8003o7dszsl7vnhf5', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnoc003q7dsztym6xljg', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnoe003r7dszahtfdf66', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnok003u7dszx6kymzur', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnos003y7dsz8candci0', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnp300437dszej4yzecp', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnp500447dszhfkfnaem', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnpb00477dszjvllh95f', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnpm004c7dszzdl9aodr', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnpw004h7dszlcl5wrxx', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnpy004i7dszrz6jbgm0', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnq4004l7dszxkhmxpnm', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnqe004o7dszwhi9ajhj', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnqo004t7dszj6uv86ju', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnqq004u7dsz0am51ors', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnqy004y7dszyml8e5k2', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnr700527dszlse6h1hp', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnrk00587dszrkoi3e65', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnrm00597dsza5tcey8j', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnrv005d7dszp3ry7o4n', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lns6005i7dszfhwaffqz', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnsg005m7dsznljfclaw', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lntr00687dszb9vcnbh8', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnsq005r7dszr8j0zhox', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnss005s7dsz187kvmds', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnsu005t7dszdezbfxk2', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnsw005u7dsznfyfiue5', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lntj00657dszbcj02nc2', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnu4006d7dsz740f5t7l', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnub006g7dsz87koaf6m', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnui006j7dsz7foulvan', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnuo006m7dszbzd0dwei', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnuv006p7dszkgrg7895', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnv1006s7dszeak7a3zv', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnsz005v7dszbag1vgiv', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnty006b7dszt17zdeuj', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnv9006w7dsznjw9yyzw', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnve006y7dszf6ntd3h4', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnvj00707dsznt1xx4bu', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnvo00727dsz9cgrzo88', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnvu00747dszjupb0ugx', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnvy00767dsz5bhy25fr', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwm007g7dsz0xtfz2jv', 'cmt38lnw200787dszxavwwd7q', '2026-08-21T17:42:24.143+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnit00147dszsed94xm7', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnpy004i7dszrz6jbgm0', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnq4004l7dszxkhmxpnm', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnqe004o7dszwhi9ajhj', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnqg004p7dszwjivjnk1', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnqi004q7dszcgzooqwo', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnqk004r7dszxqmh72si', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnqm004s7dsz34j5tqcw', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnv9006w7dsznjw9yyzw', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnvc006x7dszhequi094', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnve006y7dszf6ntd3h4', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnvg006z7dsz6is4welw', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnvj00707dsznt1xx4bu', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnvm00717dszkir8e37g', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnl500287dszuugc0mfx', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwp007h7dszxuj89y5z', 'cmt38lnln002h7dszjw72c3rx', '2026-08-21T17:42:24.150+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwr007i7dszcs441b72', 'cmt38lnit00147dszsed94xm7', '2026-08-21T17:42:24.156+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwr007i7dszcs441b72', 'cmt38lnqe004o7dszwhi9ajhj', '2026-08-21T17:42:24.156+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwr007i7dszcs441b72', 'cmt38lnpy004i7dszrz6jbgm0', '2026-08-21T17:42:24.156+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwr007i7dszcs441b72', 'cmt38lnq4004l7dszxkhmxpnm', '2026-08-21T17:42:24.156+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwr007i7dszcs441b72', 'cmt38lnvo00727dsz9cgrzo88', '2026-08-21T17:42:24.156+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwr007i7dszcs441b72', 'cmt38lnvr00737dsz2qcfgx3g', '2026-08-21T17:42:24.156+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwr007i7dszcs441b72', 'cmt38lnvu00747dszjupb0ugx', '2026-08-21T17:42:24.156+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwr007i7dszcs441b72', 'cmt38lnvw00757dszahljtppj', '2026-08-21T17:42:24.156+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwr007i7dszcs441b72', 'cmt38lnvy00767dsz5bhy25fr', '2026-08-21T17:42:24.156+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwr007i7dszcs441b72', 'cmt38lnw000777dszyrm0z54g', '2026-08-21T17:42:24.156+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwr007i7dszcs441b72', 'cmt38lnw200787dszxavwwd7q', '2026-08-21T17:42:24.156+00:00', 'system');
INSERT INTO "role_permissions" ("roleId", "permissionId", "grantedAt", "grantedById") VALUES ('cmt38lnwr007i7dszcs441b72', 'cmt38lnw300797dsz9rjbznvo', '2026-08-21T17:42:24.156+00:00', 'system');
INSERT INTO "user_roles" ("id", "userId", "roleId", "branchId", "assignedAt", "assignedById", "expiresAt") VALUES ('cmt38lo8m007m7dszqpigsj2j', 'cmt38lo8g007k7dszrqmx0hz6', 'cmt38lnw6007a7dsz8g1wmr5c', NULL, '2026-08-21T17:42:24.503+00:00', 'system', NULL);
INSERT INTO "user_roles" ("id", "userId", "roleId", "branchId", "assignedAt", "assignedById", "expiresAt") VALUES ('urole_superadmin_001', 'user_superadmin_001', 'cmt38lnw6007a7dsz8g1wmr5c', NULL, '2026-08-21 17:42:35', 'user_superadmin_001', NULL);
INSERT INTO "settings" ("id", "companyId", "key", "value", "category", "description", "isPublic", "updatedAt", "updatedById") VALUES ('cmt38lnh2000n7dszjjqdr689', 'company_main', 'auth.session_timeout_minutes', '480', 'auth', 'Session duration in minutes (default 8 hours)', 0, '2026-08-21T17:42:23.510+00:00', 'system');
INSERT INTO "settings" ("id", "companyId", "key", "value", "category", "description", "isPublic", "updatedAt", "updatedById") VALUES ('cmt38lnh7000p7dszy0bekffc', 'company_main', 'auth.remember_me_days', '30', 'auth', 'Remember me session duration in days', 0, '2026-08-21T17:42:23.516+00:00', 'system');
INSERT INTO "settings" ("id", "companyId", "key", "value", "category", "description", "isPublic", "updatedAt", "updatedById") VALUES ('cmt38lnhd000r7dszb4z2aghw', 'company_main', 'auth.max_sessions_per_user', '5', 'auth', 'Maximum concurrent sessions per user', 0, '2026-08-21T17:42:23.522+00:00', 'system');
INSERT INTO "settings" ("id", "companyId", "key", "value", "category", "description", "isPublic", "updatedAt", "updatedById") VALUES ('cmt38lnhl000t7dszzwc42h7n', 'company_main', 'auth.password_min_length', '8', 'auth', 'Minimum password length', 0, '2026-08-21T17:42:23.529+00:00', 'system');
INSERT INTO "settings" ("id", "companyId", "key", "value", "category", "description", "isPublic", "updatedAt", "updatedById") VALUES ('cmt38lnhq000v7dszn3cv651l', 'company_main', 'auth.login_lockout_attempts', '5', 'auth', 'Failed attempts before lockout (0 = disabled)', 0, '2026-08-21T17:42:23.534+00:00', 'system');
INSERT INTO "settings" ("id", "companyId", "key", "value", "category", "description", "isPublic", "updatedAt", "updatedById") VALUES ('cmt38lnhv000x7dszk66uzuip', 'company_main', 'auth.login_lockout_minutes', '15', 'auth', 'Lockout duration in minutes', 0, '2026-08-21T17:42:23.540+00:00', 'system');
INSERT INTO "settings" ("id", "companyId", "key", "value", "category", "description", "isPublic", "updatedAt", "updatedById") VALUES ('cmt38lni1000z7dsz0fvpl2o7', 'company_main', 'general.date_format', 'YYYY-MM-DD', 'general', 'Date display format', 1, '2026-08-21T17:42:23.545+00:00', 'system');
INSERT INTO "settings" ("id", "companyId", "key", "value", "category", "description", "isPublic", "updatedAt", "updatedById") VALUES ('cmt38lni600117dsz15kh72zw', 'company_main', 'general.time_format', '24h', 'general', 'Time display format (12h or 24h)', 1, '2026-08-21T17:42:23.551+00:00', 'system');
INSERT INTO "settings" ("id", "companyId", "key", "value", "category", "description", "isPublic", "updatedAt", "updatedById") VALUES ('cmt38lnin00137dszofyi50ez', 'company_main', 'general.app_version', '1.0.0', 'general', 'Application version', 1, '2026-08-21T17:42:23.567+00:00', 'system');
INSERT INTO "exchange_rates" ("id", "companyId", "fromCurrency", "toCurrency", "rate", "source", "effectiveDate", "notes", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lo8o007n7dszrjd81wl1', 'company_main', 'USD', 'TZS', 2600, 'MANUAL', '2026-08-21T17:42:24.504+00:00', NULL, '2026-08-21T17:42:24.505+00:00', '2026-08-21T17:42:24.505+00:00', 'system');
INSERT INTO "exchange_rates" ("id", "companyId", "fromCurrency", "toCurrency", "rate", "source", "effectiveDate", "notes", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lo8r007o7dszk7u465zl', 'company_main', 'EUR', 'TZS', 2800, 'MANUAL', '2026-08-21T17:42:24.506+00:00', NULL, '2026-08-21T17:42:24.507+00:00', '2026-08-21T17:42:24.507+00:00', 'system');
INSERT INTO "exchange_rates" ("id", "companyId", "fromCurrency", "toCurrency", "rate", "source", "effectiveDate", "notes", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lo8u007p7dsz1be9kopu', 'company_main', 'GBP', 'TZS', 3300, 'MANUAL', '2026-08-21T17:42:24.509+00:00', NULL, '2026-08-21T17:42:24.510+00:00', '2026-08-21T17:42:24.510+00:00', 'system');
INSERT INTO "exchange_rates" ("id", "companyId", "fromCurrency", "toCurrency", "rate", "source", "effectiveDate", "notes", "createdAt", "updatedAt", "createdById") VALUES ('cmt38lo8w007q7dszv7javzoq', 'company_main', 'KES', 'TZS', 20, 'MANUAL', '2026-08-21T17:42:24.512+00:00', NULL, '2026-08-21T17:42:24.512+00:00', '2026-08-21T17:42:24.512+00:00', 'system');
PRAGMA foreign_keys=ON;
SELECT 'Setup complete — ' || (SELECT count(*) FROM permissions) || ' permissions, ' || (SELECT count(*) FROM roles) || ' roles, ' || (SELECT count(*) FROM users) || ' users' AS status;
