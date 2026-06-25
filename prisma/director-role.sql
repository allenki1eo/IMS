-- ============================================================
-- Director Role — insert script
-- Compatible with PostgreSQL, Turso/libSQL, and SQLite 3.24+
--
-- Run against your database:
--   Turso:      turso db shell <db-name> < prisma/director-role.sql
--   PostgreSQL: psql $DATABASE_URL -f prisma/director-role.sql
--   SQLite:     sqlite3 dev.db < prisma/director-role.sql
--
-- Safe to re-run: ON CONFLICT DO NOTHING throughout.
-- ============================================================

-- 1. Create the Director role
INSERT INTO roles (id, name, code, description, "isSystemRole", "isActive", "createdAt", "updatedAt")
VALUES (
  'role_director_001',
  'Director',
  'DIRECTOR',
  'Executive director — full finance visibility and cross-company reporting',
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- 2. Ensure all required permissions exist
--    ON CONFLICT DO NOTHING skips rows already created by the seed.

-- Auth
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_auth_session_create',       'auth',        'session',    'create',   'Login / create session')              ON CONFLICT (module, resource, action) DO NOTHING;

-- Company
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_company_company_read',      'company',     'company',    'read',     'View company profile')                ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_company_branch_read',       'company',     'branch',     'read',     'View branches')                       ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_company_dept_read',         'company',     'department', 'read',     'View departments')                    ON CONFLICT (module, resource, action) DO NOTHING;

-- Users / Employees
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_users_user_read',           'users',       'user',       'read',     'View users')                          ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_employees_employee_read',   'employees',   'employee',   'read',     'View employees')                      ON CONFLICT (module, resource, action) DO NOTHING;

-- Audit
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_audit_log_read',            'audit',       'log',        'read',     'View audit logs')                     ON CONFLICT (module, resource, action) DO NOTHING;

-- Approvals
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_approvals_req_read',        'approvals',   'request',    'read',     'View approval requests')              ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_approvals_req_approve',     'approvals',   'request',    'approve',  'Approve/reject requests')             ON CONFLICT (module, resource, action) DO NOTHING;

-- Finance
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_fin_account_read',          'finance',     'account',    'read',     'View chart of accounts')              ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_fin_journal_read',          'finance',     'journal',    'read',     'View journal entries')                ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_fin_bank_read',             'finance',     'bank',       'read',     'View bank accounts')                  ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_fin_payment_read',          'finance',     'payment',    'read',     'View payments')                       ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_fin_cashbook_read',         'finance',     'cashbook',   'read',     'View cashbook entries')               ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_fin_cashbook_director',     'finance',     'cashbook',   'director', 'View cross-company director cashbook') ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_fin_report_read',           'finance',     'report',     'read',     'View financial reports')              ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_fin_tally_read',            'finance',     'tally',      'read',     'View Tally sync data')                ON CONFLICT (module, resource, action) DO NOTHING;

-- Warehouse
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_wh_warehouse_read',         'warehouse',   'warehouse',  'read',     'View warehouses')                     ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_wh_item_read',              'warehouse',   'item',       'read',     'View items')                          ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_wh_stock_read',             'warehouse',   'stock',      'read',     'View stock balances')                 ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_wh_grn_read',               'warehouse',   'grn',        'read',     'View GRNs')                           ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_wh_transfer_read',          'warehouse',   'transfer',   'read',     'View stock transfers')                ON CONFLICT (module, resource, action) DO NOTHING;

-- Transport
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_trans_vehicle_read',        'transport',   'vehicle',    'read',     'View vehicles')                       ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_trans_trip_read',           'transport',   'trip',       'read',     'View trips')                          ON CONFLICT (module, resource, action) DO NOTHING;

-- Fuel
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_fuel_tank_read',            'fuel',        'tank',       'read',     'View fuel tanks')                     ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_fuel_receipt_read',         'fuel',        'receipt',    'read',     'View fuel receipts')                  ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_fuel_issue_read',           'fuel',        'issue',      'read',     'View fuel issues')                    ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_fuel_price_read',           'fuel',        'price',      'read',     'View fuel prices')                    ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_fuel_report_read',          'fuel',        'report',     'read',     'View fuel reports')                   ON CONFLICT (module, resource, action) DO NOTHING;

-- Maintenance
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_maint_workorder_read',      'maintenance', 'workorder',  'read',     'View work orders')                    ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_maint_report_read',         'maintenance', 'report',     'read',     'View maintenance reports')            ON CONFLICT (module, resource, action) DO NOTHING;

-- Procurement
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_proc_supplier_read',        'procurement', 'supplier',   'read',     'View suppliers')                      ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_proc_request_read',         'procurement', 'request',    'read',     'View purchase requests')              ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_proc_order_read',           'procurement', 'order',      'read',     'View purchase orders')                ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_proc_report_read',          'procurement', 'report',     'read',     'View procurement reports')            ON CONFLICT (module, resource, action) DO NOTHING;

-- Production
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_prod_line_read',            'production',  'line',       'read',     'View production lines')               ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_prod_recipe_read',          'production',  'recipe',     'read',     'View recipes')                        ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_prod_batch_read',           'production',  'batch',      'read',     'View batches')                        ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_prod_report_read',          'production',  'report',     'read',     'View production reports')             ON CONFLICT (module, resource, action) DO NOTHING;

-- QC
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_qc_standard_read',          'qc',          'standard',   'read',     'View QC standards')                   ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_qc_test_read',              'qc',          'test',       'read',     'View QC tests')                       ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_qc_ncr_read',               'qc',          'ncr',        'read',     'View non-conformance reports')        ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_qc_report_read',            'qc',          'report',     'read',     'View QC reports')                     ON CONFLICT (module, resource, action) DO NOTHING;

-- Dispatch
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_dispatch_product_read',     'dispatch',    'product',    'read',     'View FG products')                    ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_dispatch_lot_read',         'dispatch',    'lot',        'read',     'View FG lots')                        ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_dispatch_order_read',       'dispatch',    'order',      'read',     'View dispatch orders')                ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_dispatch_report_read',      'dispatch',    'report',     'read',     'View dispatch reports')               ON CONFLICT (module, resource, action) DO NOTHING;

-- Cotton
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_cotton_season_read',        'cotton',      'season',     'read',     'View cotton seasons')                 ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_cotton_bale_read',          'cotton',      'bale',       'read',     'View cotton bales')                   ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_cotton_lot_read',           'cotton',      'lot',        'read',     'View cotton lots')                    ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_cotton_buyer_read',         'cotton',      'buyer',      'read',     'View cotton buyers')                  ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_cotton_contract_read',      'cotton',      'contract',   'read',     'View cotton contracts')               ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_cotton_invoice_read',       'cotton',      'invoice',    'read',     'View cotton invoices')                ON CONFLICT (module, resource, action) DO NOTHING;

-- Analytics / Reports
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_analytics_dash_read',       'analytics',   'dashboard',  'read',     'View analytics dashboard')            ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_analytics_ops_read',        'analytics',   'operations', 'read',     'View operational analytics')          ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_analytics_fin_read',        'analytics',   'financial',  'read',     'View financial analytics')            ON CONFLICT (module, resource, action) DO NOTHING;
INSERT INTO permissions (id, module, resource, action, description) VALUES ('perm_reports_report_read',        'reports',     'report',     'read',     'View module reports')                 ON CONFLICT (module, resource, action) DO NOTHING;

-- ============================================================
-- 3. Link all permissions to the Director role
--    Sub-select on (module, resource, action) so it works
--    regardless of which IDs the seed assigned.
-- ============================================================

INSERT INTO role_permissions ("roleId", "permissionId", "grantedAt", "grantedById")
SELECT 'role_director_001', id, NOW(), 'role_director_001'
FROM permissions
WHERE (module, resource, action) IN (
  ('auth',        'session',    'create'),
  ('company',     'company',    'read'),
  ('company',     'branch',     'read'),
  ('company',     'department', 'read'),
  ('users',       'user',       'read'),
  ('employees',   'employee',   'read'),
  ('audit',       'log',        'read'),
  ('approvals',   'request',    'read'),
  ('approvals',   'request',    'approve'),
  ('finance',     'account',    'read'),
  ('finance',     'journal',    'read'),
  ('finance',     'bank',       'read'),
  ('finance',     'payment',    'read'),
  ('finance',     'cashbook',   'read'),
  ('finance',     'cashbook',   'director'),
  ('finance',     'report',     'read'),
  ('finance',     'tally',      'read'),
  ('warehouse',   'warehouse',  'read'),
  ('warehouse',   'item',       'read'),
  ('warehouse',   'stock',      'read'),
  ('warehouse',   'grn',        'read'),
  ('warehouse',   'transfer',   'read'),
  ('transport',   'vehicle',    'read'),
  ('transport',   'trip',       'read'),
  ('fuel',        'tank',       'read'),
  ('fuel',        'receipt',    'read'),
  ('fuel',        'issue',      'read'),
  ('fuel',        'price',      'read'),
  ('fuel',        'report',     'read'),
  ('maintenance', 'workorder',  'read'),
  ('maintenance', 'report',     'read'),
  ('procurement', 'supplier',   'read'),
  ('procurement', 'request',    'read'),
  ('procurement', 'order',      'read'),
  ('procurement', 'report',     'read'),
  ('production',  'line',       'read'),
  ('production',  'recipe',     'read'),
  ('production',  'batch',      'read'),
  ('production',  'report',     'read'),
  ('qc',          'standard',   'read'),
  ('qc',          'test',       'read'),
  ('qc',          'ncr',        'read'),
  ('qc',          'report',     'read'),
  ('dispatch',    'product',    'read'),
  ('dispatch',    'lot',        'read'),
  ('dispatch',    'order',      'read'),
  ('dispatch',    'report',     'read'),
  ('cotton',      'season',     'read'),
  ('cotton',      'bale',       'read'),
  ('cotton',      'lot',        'read'),
  ('cotton',      'buyer',      'read'),
  ('cotton',      'contract',   'read'),
  ('cotton',      'invoice',    'read'),
  ('analytics',   'dashboard',  'read'),
  ('analytics',   'operations', 'read'),
  ('analytics',   'financial',  'read'),
  ('reports',     'report',     'read')
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- ============================================================
-- Verify — should return: Director | DIRECTOR | 57
-- ============================================================
SELECT r.name, r.code, COUNT(rp."permissionId") AS permission_count
FROM roles r
LEFT JOIN role_permissions rp ON rp."roleId" = r.id
WHERE r.code = 'DIRECTOR'
GROUP BY r.id, r.name, r.code;
