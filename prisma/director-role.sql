-- ============================================================
-- Director Role — insert script
-- Compatible with SQLite (Turso/libSQL)
--
-- Run against your database:
--   Local:  sqlite3 dev.db < prisma/director-role.sql
--   Turso:  turso db shell <db-name> < prisma/director-role.sql
--
-- Safe to re-run: uses INSERT OR IGNORE throughout.
-- ============================================================

-- 1. Create the Director role
INSERT OR IGNORE INTO roles (id, name, code, description, isSystemRole, isActive, createdAt, updatedAt)
VALUES (
  'role_director_001',
  'Director',
  'DIRECTOR',
  'Executive director — full finance visibility and cross-company reporting',
  1,
  1,
  datetime('now'),
  datetime('now')
);

-- 2. Ensure all required permissions exist
--    (INSERT OR IGNORE — skips if the permission was already created by seed)

-- Auth
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_auth_session_create',     'auth',        'session',       'create',     'Login / create session');

-- Company
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_company_company_read',    'company',     'company',       'read',       'View company profile');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_company_branch_read',     'company',     'branch',        'read',       'View branches');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_company_department_read', 'company',     'department',    'read',       'View departments');

-- Users / Employees
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_users_user_read',         'users',       'user',          'read',       'View users');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_employees_employee_read', 'employees',   'employee',      'read',       'View employees');

-- Audit
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_audit_log_read',          'audit',       'log',           'read',       'View audit logs');

-- Approvals
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_approvals_request_read',    'approvals',   'request',       'read',       'View approval requests');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_approvals_request_approve', 'approvals',   'request',       'approve',    'Approve/reject requests');

-- Finance
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_finance_account_read',        'finance', 'account',  'read',      'View chart of accounts');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_finance_journal_read',        'finance', 'journal',  'read',      'View journal entries');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_finance_bank_read',           'finance', 'bank',     'read',      'View bank accounts');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_finance_payment_read',        'finance', 'payment',  'read',      'View payments');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_finance_cashbook_read',       'finance', 'cashbook', 'read',      'View cashbook entries');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_finance_cashbook_director',   'finance', 'cashbook', 'director',  'View cross-company director cashbook');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_finance_report_read',         'finance', 'report',   'read',      'View financial reports');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_finance_tally_read',          'finance', 'tally',    'read',      'View Tally sync data');

-- Warehouse
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_warehouse_warehouse_read',   'warehouse', 'warehouse', 'read', 'View warehouses');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_warehouse_item_read',        'warehouse', 'item',      'read', 'View items');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_warehouse_stock_read',       'warehouse', 'stock',     'read', 'View stock balances');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_warehouse_grn_read',         'warehouse', 'grn',       'read', 'View GRNs');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_warehouse_transfer_read',    'warehouse', 'transfer',  'read', 'View stock transfers');

-- Transport
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_transport_vehicle_read',    'transport', 'vehicle',  'read', 'View vehicles');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_transport_trip_read',       'transport', 'trip',     'read', 'View trips');

-- Fuel
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_fuel_tank_read',            'fuel', 'tank',    'read', 'View fuel tanks');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_fuel_receipt_read',         'fuel', 'receipt', 'read', 'View fuel receipts');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_fuel_issue_read',           'fuel', 'issue',   'read', 'View fuel issues');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_fuel_price_read',           'fuel', 'price',   'read', 'View fuel prices');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_fuel_report_read',          'fuel', 'report',  'read', 'View fuel reports');

-- Maintenance
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_maint_workorder_read',      'maintenance', 'workorder', 'read', 'View work orders');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_maint_report_read',         'maintenance', 'report',    'read', 'View maintenance reports');

-- Procurement
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_proc_supplier_read',        'procurement', 'supplier', 'read', 'View suppliers');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_proc_request_read',         'procurement', 'request',  'read', 'View purchase requests');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_proc_order_read',           'procurement', 'order',    'read', 'View purchase orders');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_proc_report_read',          'procurement', 'report',   'read', 'View procurement reports');

-- Production
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_prod_line_read',            'production', 'line',    'read', 'View production lines');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_prod_recipe_read',          'production', 'recipe',  'read', 'View recipes');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_prod_batch_read',           'production', 'batch',   'read', 'View batches');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_prod_report_read',          'production', 'report',  'read', 'View production reports');

-- QC
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_qc_standard_read',          'qc', 'standard', 'read', 'View QC standards');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_qc_test_read',              'qc', 'test',     'read', 'View QC tests');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_qc_ncr_read',               'qc', 'ncr',      'read', 'View non-conformance reports');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_qc_report_read',            'qc', 'report',   'read', 'View QC reports');

-- Dispatch
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_dispatch_product_read',     'dispatch', 'product', 'read', 'View FG products');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_dispatch_lot_read',         'dispatch', 'lot',     'read', 'View FG lots');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_dispatch_order_read',       'dispatch', 'order',   'read', 'View dispatch orders');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_dispatch_report_read',      'dispatch', 'report',  'read', 'View dispatch reports');

-- Cotton
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_cotton_season_read',        'cotton', 'season',   'read', 'View cotton seasons');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_cotton_bale_read',          'cotton', 'bale',     'read', 'View cotton bales');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_cotton_lot_read',           'cotton', 'lot',      'read', 'View cotton lots');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_cotton_buyer_read',         'cotton', 'buyer',    'read', 'View cotton buyers');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_cotton_contract_read',      'cotton', 'contract', 'read', 'View cotton contracts');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_cotton_invoice_read',       'cotton', 'invoice',  'read', 'View cotton invoices');

-- Analytics / Reports
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_analytics_dashboard_read',  'analytics', 'dashboard',  'read', 'View analytics dashboard');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_analytics_ops_read',        'analytics', 'operations', 'read', 'View operational analytics');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_analytics_fin_read',        'analytics', 'financial',  'read', 'View financial analytics');
INSERT OR IGNORE INTO permissions (id, module, resource, action, description) VALUES ('perm_reports_report_read',       'reports',   'report',     'read', 'View module reports');

-- ============================================================
-- 3. Link permissions to the Director role
--    Uses a sub-select to look up the real permission id by
--    (module, resource, action) — works even if the permissions
--    were created by the seed with different ids.
-- ============================================================

INSERT OR IGNORE INTO role_permissions (roleId, permissionId, grantedAt, grantedById)
SELECT 'role_director_001', id, datetime('now'), 'role_director_001'
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
);

-- ============================================================
-- Verify
-- ============================================================
SELECT r.name, r.code, COUNT(rp.permissionId) AS permission_count
FROM roles r
LEFT JOIN role_permissions rp ON rp.roleId = r.id
WHERE r.code = 'DIRECTOR'
GROUP BY r.id;
