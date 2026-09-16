-- ============================================================
-- Add a Super Admin user
-- Paste into: turso db shell <db-name>   (or the Turso web shell)
--
-- Login:    superadmin
-- Password: SuperAdmin@2026
-- (mustChangePassword = 1, so the app forces a new password on
--  first login. Safe to re-run: ON CONFLICT DO NOTHING.)
-- ============================================================

-- 1. The user (password hash = bcrypt of "SuperAdmin@2026", cost 12)
INSERT INTO users (
  id, username, email, "passwordHash", "fullName",
  "isActive", "isSystemUser", "mustChangePassword",
  "companyId", "createdAt", "updatedAt"
)
VALUES (
  'user_superadmin_001',
  'superadmin',
  'superadmin@company.local',
  '$2a$12$WZYYvz8AiyGcvr1sAFRV9.mpm1qYW4UbHpA8vHxI.q2.WGXjw6aIu',
  'Super Administrator',
  1, 1, 1,
  (SELECT id FROM companies LIMIT 1),
  datetime('now'), datetime('now')
)
ON CONFLICT (username) DO NOTHING;

-- 2. Assign the Super Admin role
INSERT INTO user_roles (id, "userId", "roleId", "assignedAt", "assignedById")
SELECT
  'urole_superadmin_001',
  u.id,
  r.id,
  datetime('now'),
  u.id
FROM users u, roles r
WHERE u.username = 'superadmin' AND r.code = 'SUPER_ADMIN'
ON CONFLICT (id) DO NOTHING;

-- 3. Verify — should return one row: superadmin | Super Admin
SELECT u.username, r.name AS role
FROM users u
JOIN user_roles ur ON ur."userId" = u.id
JOIN roles r ON r.id = ur."roleId"
WHERE u.username = 'superadmin';
