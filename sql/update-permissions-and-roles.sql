-- =============================================================================
-- IMS Permission & Role Updates
-- Run this in your Supabase SQL Editor (safe to run multiple times)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Insert any missing permissions
-- -----------------------------------------------------------------------------

INSERT INTO permissions (id, module, resource, action, description)
VALUES
  -- Company switching (new)
  (gen_random_uuid(), 'company', 'company', 'switch', 'Switch between companies'),

  -- Brewing Records (add if not already present)
  (gen_random_uuid(), 'brewing', 'session', 'read',  'View mashing/brewing session records'),
  (gen_random_uuid(), 'brewing', 'session', 'write', 'Create/edit mashing/brewing session records'),
  (gen_random_uuid(), 'brewing', 'material','read',  'View brewhouse material usage records'),
  (gen_random_uuid(), 'brewing', 'material','write', 'Create/edit brewhouse material usage records'),
  (gen_random_uuid(), 'brewing', 'cip',     'read',  'View CIP cleaning records'),
  (gen_random_uuid(), 'brewing', 'cip',     'write', 'Create/edit CIP cleaning records'),

  -- Lab Records (add if not already present)
  (gen_random_uuid(), 'lab', 'unitank', 'read',  'View unitank analysis records'),
  (gen_random_uuid(), 'lab', 'unitank', 'write', 'Create/edit unitank analysis records'),
  (gen_random_uuid(), 'lab', 'bbt',     'read',  'View BBT analysis records'),
  (gen_random_uuid(), 'lab', 'bbt',     'write', 'Create/edit BBT analysis records'),
  (gen_random_uuid(), 'lab', 'micro',   'read',  'View daily micro reports'),
  (gen_random_uuid(), 'lab', 'micro',   'write', 'Create/edit daily micro reports'),
  (gen_random_uuid(), 'lab', 'spec',    'read',  'View packaged product specs'),
  (gen_random_uuid(), 'lab', 'spec',    'write', 'Create/edit packaged product specs')

ON CONFLICT (module, resource, action) DO NOTHING;


-- -----------------------------------------------------------------------------
-- STEP 2: Grant company:company:switch to COMPANY_ADMIN and BRANCH_MANAGER
-- (SUPER_ADMIN already has all permissions via the seed's wildcard logic)
-- -----------------------------------------------------------------------------

INSERT INTO role_permissions ("roleId", "permissionId", "grantedById", "grantedAt")
SELECT r.id, p.id, 'system', NOW()
FROM roles r, permissions p
WHERE r.code IN ('COMPANY_ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN')
  AND p.module = 'company' AND p.resource = 'company' AND p.action = 'switch'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;


-- -----------------------------------------------------------------------------
-- STEP 3: Grant brewing + lab READ+WRITE to BRANCH_MANAGER
-- -----------------------------------------------------------------------------

INSERT INTO role_permissions ("roleId", "permissionId", "grantedById", "grantedAt")
SELECT r.id, p.id, 'system', NOW()
FROM roles r, permissions p
WHERE r.code = 'BRANCH_MANAGER'
  AND (
    (p.module = 'brewing' AND p.resource IN ('session','material','cip') AND p.action IN ('read','write'))
    OR
    (p.module = 'lab'     AND p.resource IN ('unitank','bbt','micro','spec') AND p.action IN ('read','write'))
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;


-- -----------------------------------------------------------------------------
-- STEP 4: Grant brewing + lab READ+WRITE to DEPT_HEAD
--         Also grant finance:cashbook:read/write and tra-stamps:stamp:read
-- -----------------------------------------------------------------------------

INSERT INTO role_permissions ("roleId", "permissionId", "grantedById", "grantedAt")
SELECT r.id, p.id, 'system', NOW()
FROM roles r, permissions p
WHERE r.code = 'DEPT_HEAD'
  AND (
    (p.module = 'brewing'    AND p.resource IN ('session','material','cip') AND p.action IN ('read','write'))
    OR
    (p.module = 'lab'        AND p.resource IN ('unitank','bbt','micro','spec') AND p.action IN ('read','write'))
    OR
    (p.module = 'finance'    AND p.resource = 'cashbook' AND p.action IN ('read','write'))
    OR
    (p.module = 'tra-stamps' AND p.resource = 'stamp'    AND p.action = 'read')
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;


-- -----------------------------------------------------------------------------
-- STEP 5: Grant brewing + lab READ to AUDITOR
--         Also grant reports:report:read and finance:tally:read
-- -----------------------------------------------------------------------------

INSERT INTO role_permissions ("roleId", "permissionId", "grantedById", "grantedAt")
SELECT r.id, p.id, 'system', NOW()
FROM roles r, permissions p
WHERE r.code = 'AUDITOR'
  AND (
    (p.module = 'brewing' AND p.resource IN ('session','material','cip') AND p.action = 'read')
    OR
    (p.module = 'lab'     AND p.resource IN ('unitank','bbt','micro','spec') AND p.action = 'read')
    OR
    (p.module = 'reports' AND p.resource = 'report'   AND p.action = 'read')
    OR
    (p.module = 'finance' AND p.resource = 'tally'    AND p.action = 'read')
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;


-- -----------------------------------------------------------------------------
-- STEP 6: Grant brewing + lab READ+WRITE to MANAGEMENT
--         (already in seed but run defensively)
-- -----------------------------------------------------------------------------

INSERT INTO role_permissions ("roleId", "permissionId", "grantedById", "grantedAt")
SELECT r.id, p.id, 'system', NOW()
FROM roles r, permissions p
WHERE r.code = 'MANAGEMENT'
  AND (
    (p.module = 'brewing' AND p.resource IN ('session','material','cip') AND p.action = 'read')
    OR
    (p.module = 'lab'     AND p.resource IN ('unitank','bbt','micro','spec') AND p.action = 'read')
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;


-- -----------------------------------------------------------------------------
-- STEP 7: Ensure BREW_OPERATOR and LAB_TECHNICIAN roles exist and have correct perms
-- -----------------------------------------------------------------------------

-- Insert roles if they don't exist yet
INSERT INTO roles (id, name, code, description, "isSystemRole", "isActive", "createdAt", "updatedAt", "createdById")
VALUES
  (gen_random_uuid(), 'Brew Operator',  'BREW_OPERATOR',  'Records brewing process, material usage, and CIP records', true, true, NOW(), NOW(), 'system'),
  (gen_random_uuid(), 'Lab Technician', 'LAB_TECHNICIAN', 'Records unitank/BBT analyses, micro reports, and product specs', true, true, NOW(), NOW(), 'system')
ON CONFLICT (code) DO NOTHING;

-- BREW_OPERATOR permissions
INSERT INTO role_permissions ("roleId", "permissionId", "grantedById", "grantedAt")
SELECT r.id, p.id, 'system', NOW()
FROM roles r, permissions p
WHERE r.code = 'BREW_OPERATOR'
  AND (
    (p.module = 'auth'       AND p.resource = 'session' AND p.action = 'create')
    OR (p.module = 'production' AND p.resource IN ('line','recipe') AND p.action = 'read')
    OR (p.module = 'production' AND p.resource = 'batch' AND p.action IN ('read','create','update','start','complete'))
    OR (p.module = 'brewing'    AND p.resource IN ('session','material','cip') AND p.action IN ('read','write'))
    OR (p.module = 'warehouse'  AND p.resource IN ('item','stock') AND p.action = 'read')
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- LAB_TECHNICIAN permissions
INSERT INTO role_permissions ("roleId", "permissionId", "grantedById", "grantedAt")
SELECT r.id, p.id, 'system', NOW()
FROM roles r, permissions p
WHERE r.code = 'LAB_TECHNICIAN'
  AND (
    (p.module = 'auth'       AND p.resource = 'session' AND p.action = 'create')
    OR (p.module = 'production' AND p.resource IN ('batch','line','recipe') AND p.action = 'read')
    OR (p.module = 'qc'         AND p.resource = 'standard' AND p.action = 'read')
    OR (p.module = 'qc'         AND p.resource = 'test'  AND p.action IN ('read','create','update','complete'))
    OR (p.module = 'qc'         AND p.resource = 'ncr'   AND p.action IN ('read','create'))
    OR (p.module = 'lab'        AND p.resource IN ('unitank','bbt','micro','spec') AND p.action IN ('read','write'))
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;


-- -----------------------------------------------------------------------------
-- VERIFICATION — run this to confirm counts look right
-- -----------------------------------------------------------------------------

SELECT r.code, COUNT(rp."permissionId") AS perm_count
FROM roles r
LEFT JOIN role_permissions rp ON rp."roleId" = r.id
GROUP BY r.code
ORDER BY r.code;


-- =============================================================================
-- STORE ISSUES & DAILY STORE REPORT (procurement flow)
-- =============================================================================

-- New planning columns on items
ALTER TABLE items ADD COLUMN IF NOT EXISTS "projectedWeeklyUsage" DOUBLE PRECISION;
ALTER TABLE items ADD COLUMN IF NOT EXISTS "leadTimeWeeks" DOUBLE PRECISION;
ALTER TABLE items ADD COLUMN IF NOT EXISTS "confirmationNote" TEXT;

-- Store issues (issue to production / returns / other movements)
CREATE TABLE IF NOT EXISTS store_issues (
  id          TEXT PRIMARY KEY,
  "companyId"   TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL REFERENCES warehouses(id),
  reference   TEXT NOT NULL UNIQUE,
  "issueType"   TEXT NOT NULL,
  "issueDate"   TIMESTAMP(3) NOT NULL,
  destination TEXT,
  notes       TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "store_issues_companyId_issueDate_idx" ON store_issues("companyId", "issueDate");
CREATE INDEX IF NOT EXISTS "store_issues_warehouseId_idx" ON store_issues("warehouseId");
CREATE INDEX IF NOT EXISTS "store_issues_issueType_idx" ON store_issues("issueType");

CREATE TABLE IF NOT EXISTS store_issue_lines (
  id       TEXT PRIMARY KEY,
  "issueId"  TEXT NOT NULL REFERENCES store_issues(id) ON DELETE CASCADE,
  "itemId"   TEXT NOT NULL REFERENCES items(id),
  quantity DOUBLE PRECISION NOT NULL,
  notes    TEXT
);
CREATE INDEX IF NOT EXISTS "store_issue_lines_issueId_idx" ON store_issue_lines("issueId");
CREATE INDEX IF NOT EXISTS "store_issue_lines_itemId_idx" ON store_issue_lines("itemId");

-- Store issue permissions
INSERT INTO permissions (id, module, resource, action, description)
VALUES
  (gen_random_uuid(), 'warehouse', 'issue', 'read',   'View store issues and returns'),
  (gen_random_uuid(), 'warehouse', 'issue', 'create', 'Issue items to production / record returns')
ON CONFLICT (module, resource, action) DO NOTHING;

-- Grant read+create to admin/manager/dept-head + SUPER_ADMIN
INSERT INTO role_permissions ("roleId", "permissionId", "grantedById", "grantedAt")
SELECT r.id, p.id, 'system', NOW()
FROM roles r, permissions p
WHERE r.code IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'DEPT_HEAD')
  AND p.module = 'warehouse' AND p.resource = 'issue' AND p.action IN ('read', 'create')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Grant read-only to MANAGEMENT and AUDITOR
INSERT INTO role_permissions ("roleId", "permissionId", "grantedById", "grantedAt")
SELECT r.id, p.id, 'system', NOW()
FROM roles r, permissions p
WHERE r.code IN ('MANAGEMENT', 'AUDITOR')
  AND p.module = 'warehouse' AND p.resource = 'issue' AND p.action = 'read'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
