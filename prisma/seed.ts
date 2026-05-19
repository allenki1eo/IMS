import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

// ─── Permission definitions ──────────────────────────────
const PERMISSIONS = [
  // Auth
  { module: "auth", resource: "session", action: "create", description: "Login to the system" },
  // Users
  { module: "users", resource: "user", action: "create", description: "Create user accounts" },
  { module: "users", resource: "user", action: "read", description: "View user accounts" },
  { module: "users", resource: "user", action: "update", description: "Edit user accounts" },
  { module: "users", resource: "user", action: "deactivate", description: "Deactivate user accounts" },
  { module: "users", resource: "user", action: "reset_password", description: "Reset user passwords" },
  { module: "users", resource: "user", action: "assign_role", description: "Assign/remove roles from users" },
  // Roles
  { module: "roles", resource: "role", action: "create", description: "Create roles" },
  { module: "roles", resource: "role", action: "read", description: "View roles" },
  { module: "roles", resource: "role", action: "update", description: "Edit roles" },
  { module: "roles", resource: "role", action: "deactivate", description: "Deactivate roles" },
  { module: "roles", resource: "permission", action: "assign", description: "Assign permissions to roles" },
  // Company
  { module: "company", resource: "company", action: "create", description: "Create companies" },
  { module: "company", resource: "company", action: "read", description: "View company profile" },
  { module: "company", resource: "company", action: "update", description: "Edit company profile" },
  { module: "company", resource: "branch", action: "create", description: "Create branches" },
  { module: "company", resource: "branch", action: "read", description: "View branches" },
  { module: "company", resource: "branch", action: "update", description: "Edit branches" },
  { module: "company", resource: "branch", action: "deactivate", description: "Deactivate branches" },
  { module: "company", resource: "department", action: "create", description: "Create departments" },
  { module: "company", resource: "department", action: "read", description: "View departments" },
  { module: "company", resource: "department", action: "update", description: "Edit departments" },
  { module: "company", resource: "department", action: "deactivate", description: "Deactivate departments" },
  // Employees
  { module: "employees", resource: "employee", action: "create", description: "Create employee records" },
  { module: "employees", resource: "employee", action: "read", description: "View employee records" },
  { module: "employees", resource: "employee", action: "update", description: "Edit employee records" },
  { module: "employees", resource: "employee", action: "deactivate", description: "Change employee status" },
  // Settings
  { module: "settings", resource: "settings", action: "read", description: "View system settings" },
  { module: "settings", resource: "settings", action: "update", description: "Update system settings" },
  // Audit
  { module: "audit", resource: "log", action: "read", description: "View audit logs" },
  // Approvals
  { module: "approvals", resource: "workflow", action: "manage", description: "Manage approval workflows" },
  { module: "approvals", resource: "request", action: "approve", description: "Approve/reject approval requests" },
  { module: "approvals", resource: "request", action: "read", description: "View approval requests" },
  { module: "approvals", resource: "request", action: "cancel", description: "Cancel approval requests" },
  // Warehouse
  { module: "warehouse", resource: "warehouse", action: "read", description: "View warehouses" },
  { module: "warehouse", resource: "warehouse", action: "create", description: "Create warehouses" },
  { module: "warehouse", resource: "warehouse", action: "update", description: "Edit warehouses" },
  { module: "warehouse", resource: "location", action: "read", description: "View storage locations" },
  { module: "warehouse", resource: "location", action: "create", description: "Create storage locations" },
  { module: "warehouse", resource: "location", action: "update", description: "Edit storage locations" },
  { module: "warehouse", resource: "item", action: "read", description: "View items" },
  { module: "warehouse", resource: "item", action: "create", description: "Create items" },
  { module: "warehouse", resource: "item", action: "update", description: "Edit items" },
  { module: "warehouse", resource: "uom", action: "read", description: "View units of measure" },
  { module: "warehouse", resource: "uom", action: "create", description: "Create units of measure" },
  { module: "warehouse", resource: "uom", action: "update", description: "Edit units of measure" },
  { module: "warehouse", resource: "category", action: "read", description: "View item categories" },
  { module: "warehouse", resource: "category", action: "create", description: "Create item categories" },
  { module: "warehouse", resource: "category", action: "update", description: "Edit item categories" },
  { module: "warehouse", resource: "stock", action: "read", description: "View stock levels" },
  { module: "warehouse", resource: "grn", action: "read", description: "View goods received notes" },
  { module: "warehouse", resource: "grn", action: "create", description: "Create goods received notes" },
  { module: "warehouse", resource: "grn", action: "confirm", description: "Confirm goods receipt into stock" },
  { module: "warehouse", resource: "transfer", action: "read", description: "View stock transfers" },
  { module: "warehouse", resource: "transfer", action: "create", description: "Create stock transfers" },
  { module: "warehouse", resource: "transfer", action: "dispatch", description: "Dispatch stock transfers" },
  { module: "warehouse", resource: "transfer", action: "receive", description: "Receive stock transfers" },
  { module: "warehouse", resource: "adjustment", action: "read", description: "View stock adjustments" },
  { module: "warehouse", resource: "adjustment", action: "create", description: "Create stock adjustments" },
  { module: "warehouse", resource: "adjustment", action: "submit", description: "Submit adjustments for approval" },
  { module: "warehouse", resource: "adjustment", action: "approve", description: "Approve and apply stock adjustments" },
  // Transport
  { module: "transport", resource: "vehicle", action: "read", description: "View vehicles" },
  { module: "transport", resource: "vehicle", action: "create", description: "Create vehicles" },
  { module: "transport", resource: "vehicle", action: "update", description: "Edit vehicles" },
  { module: "transport", resource: "driver", action: "read", description: "View drivers" },
  { module: "transport", resource: "driver", action: "create", description: "Create driver profiles" },
  { module: "transport", resource: "driver", action: "update", description: "Edit driver profiles" },
  { module: "transport", resource: "assignment", action: "read", description: "View vehicle assignments" },
  { module: "transport", resource: "assignment", action: "create", description: "Assign vehicles to drivers" },
  { module: "transport", resource: "assignment", action: "update", description: "Update vehicle assignments" },
  { module: "transport", resource: "trip", action: "read", description: "View trip orders" },
  { module: "transport", resource: "trip", action: "create", description: "Create trip orders" },
  { module: "transport", resource: "trip", action: "update", description: "Edit trip orders" },
  { module: "transport", resource: "trip", action: "dispatch", description: "Dispatch trips" },
  { module: "transport", resource: "trip", action: "complete", description: "Mark trips as completed" },
  { module: "transport", resource: "incident", action: "read", description: "View vehicle incidents" },
  { module: "transport", resource: "incident", action: "create", description: "Report vehicle incidents" },
  { module: "transport", resource: "incident", action: "update", description: "Update incident records" },
  { module: "transport", resource: "daily-movement", action: "read", description: "View daily truck movement reports" },
  { module: "transport", resource: "daily-movement", action: "create", description: "Create daily truck movement reports" },
  { module: "transport", resource: "daily-movement", action: "update", description: "Edit and submit daily truck movement reports" },
  // Fuel
  { module: "fuel", resource: "tank", action: "read", description: "View fuel tanks" },
  { module: "fuel", resource: "tank", action: "create", description: "Create fuel tanks" },
  { module: "fuel", resource: "tank", action: "update", description: "Edit fuel tanks" },
  { module: "fuel", resource: "receipt", action: "read", description: "View fuel receipts" },
  { module: "fuel", resource: "receipt", action: "create", description: "Create fuel receipts" },
  { module: "fuel", resource: "receipt", action: "confirm", description: "Confirm fuel receipts into tank" },
  { module: "fuel", resource: "issue", action: "read", description: "View fuel issues" },
  { module: "fuel", resource: "issue", action: "create", description: "Issue fuel to vehicles" },
  { module: "fuel", resource: "price", action: "read", description: "View fuel prices" },
  { module: "fuel", resource: "price", action: "create", description: "Record fuel prices" },
  { module: "fuel", resource: "report", action: "read", description: "View fuel consumption reports" },
  // Maintenance
  { module: "maintenance", resource: "schedule", action: "read", description: "View maintenance schedules" },
  { module: "maintenance", resource: "schedule", action: "create", description: "Create maintenance schedules" },
  { module: "maintenance", resource: "schedule", action: "update", description: "Edit maintenance schedules" },
  { module: "maintenance", resource: "workorder", action: "read", description: "View work orders" },
  { module: "maintenance", resource: "workorder", action: "create", description: "Create work orders" },
  { module: "maintenance", resource: "workorder", action: "update", description: "Edit work orders" },
  { module: "maintenance", resource: "workorder", action: "complete", description: "Complete work orders" },
  { module: "maintenance", resource: "part", action: "read", description: "View spare parts" },
  { module: "maintenance", resource: "part", action: "create", description: "Create spare parts" },
  { module: "maintenance", resource: "part", action: "update", description: "Edit spare parts" },
  { module: "maintenance", resource: "receipt", action: "read", description: "View spare part receipts" },
  { module: "maintenance", resource: "receipt", action: "create", description: "Receive spare parts into stock" },
  { module: "maintenance", resource: "report", action: "read", description: "View maintenance reports" },
  // Procurement
  { module: "procurement", resource: "supplier", action: "read", description: "View suppliers" },
  { module: "procurement", resource: "supplier", action: "create", description: "Create suppliers" },
  { module: "procurement", resource: "supplier", action: "update", description: "Edit suppliers" },
  { module: "procurement", resource: "request", action: "read", description: "View purchase requests" },
  { module: "procurement", resource: "request", action: "create", description: "Create purchase requests" },
  { module: "procurement", resource: "request", action: "update", description: "Edit purchase requests" },
  { module: "procurement", resource: "request", action: "submit", description: "Submit purchase requests" },
  { module: "procurement", resource: "request", action: "approve", description: "Approve purchase requests" },
  { module: "procurement", resource: "order", action: "read", description: "View purchase orders" },
  { module: "procurement", resource: "order", action: "create", description: "Create purchase orders" },
  { module: "procurement", resource: "order", action: "update", description: "Edit purchase orders" },
  { module: "procurement", resource: "order", action: "send", description: "Send purchase orders" },
  { module: "procurement", resource: "order", action: "receive", description: "Receive purchase orders" },
  { module: "procurement", resource: "report", action: "read", description: "View procurement reports" },
  // Production
  { module: "production", resource: "line", action: "read", description: "View production lines" },
  { module: "production", resource: "line", action: "create", description: "Create production lines" },
  { module: "production", resource: "line", action: "update", description: "Edit production lines" },
  { module: "production", resource: "recipe", action: "read", description: "View production recipes" },
  { module: "production", resource: "recipe", action: "create", description: "Create production recipes" },
  { module: "production", resource: "recipe", action: "update", description: "Edit production recipes" },
  { module: "production", resource: "batch", action: "read", description: "View production batches" },
  { module: "production", resource: "batch", action: "create", description: "Create production batches" },
  { module: "production", resource: "batch", action: "update", description: "Edit production batches" },
  { module: "production", resource: "batch", action: "start", description: "Start production batches" },
  { module: "production", resource: "batch", action: "complete", description: "Complete production batches" },
  { module: "production", resource: "report", action: "read", description: "View production reports" },
  // Finance
  { module: "finance", resource: "account", action: "read", description: "View chart of accounts" },
  { module: "finance", resource: "account", action: "create", description: "Create accounts" },
  { module: "finance", resource: "account", action: "update", description: "Edit accounts" },
  { module: "finance", resource: "account", action: "deactivate", description: "Deactivate accounts" },
  { module: "finance", resource: "journal", action: "read", description: "View journal entries" },
  { module: "finance", resource: "journal", action: "create", description: "Create journal entries" },
  { module: "finance", resource: "journal", action: "update", description: "Edit journal entries" },
  { module: "finance", resource: "journal", action: "post", description: "Post journal entries" },
  { module: "finance", resource: "journal", action: "reverse", description: "Reverse journal entries" },
  { module: "finance", resource: "bank", action: "read", description: "View bank accounts" },
  { module: "finance", resource: "bank", action: "create", description: "Create bank accounts" },
  { module: "finance", resource: "bank", action: "update", description: "Edit bank accounts" },
  { module: "finance", resource: "bank", action: "deactivate", description: "Deactivate bank accounts" },
  { module: "finance", resource: "payment", action: "read", description: "View payments" },
  { module: "finance", resource: "payment", action: "create", description: "Create payments" },
  { module: "finance", resource: "payment", action: "update", description: "Edit payments" },
  { module: "finance", resource: "payment", action: "complete", description: "Complete payments" },
  { module: "finance", resource: "payment", action: "cancel", description: "Cancel payments" },
  { module: "finance", resource: "report", action: "read", description: "View financial reports" },
  // Analytics
  { module: "analytics", resource: "dashboard", action: "read", description: "View analytics dashboard" },
  { module: "analytics", resource: "operations", action: "read", description: "View operational analytics" },
  { module: "analytics", resource: "financial", action: "read", description: "View financial analytics" },
  { module: "reports", resource: "report", action: "read", description: "View module reports" },
  // Sales
  { module: "sales", resource: "customer", action: "read", description: "View customers" },
  { module: "sales", resource: "customer", action: "create", description: "Create customers" },
  { module: "sales", resource: "customer", action: "update", description: "Edit customers" },
  { module: "sales", resource: "order", action: "read", description: "View sales orders" },
  { module: "sales", resource: "order", action: "create", description: "Create sales orders" },
  { module: "sales", resource: "order", action: "update", description: "Update sales orders" },
  { module: "sales", resource: "kpi", action: "read", description: "View sales KPIs" },
  { module: "sales", resource: "kpi", action: "manage", description: "Manage sales KPI targets" },
  { module: "sales", resource: "webhook", action: "manage", description: "Manage sales webhook settings" },
  // TRA Stamps
  { module: "tra-stamps", resource: "stamp", action: "read", description: "View TRA stamps" },
  { module: "tra-stamps", resource: "stamp", action: "create", description: "Receive TRA stamp batches" },
  { module: "tra-stamps", resource: "stamp", action: "activate", description: "Activate TRA stamps" },
];

// ─── Role definitions ─────────────────────────────────────
const ROLES = [
  { name: "Super Admin", code: "SUPER_ADMIN", description: "Full system access", isSystemRole: true },
  { name: "Company Admin", code: "COMPANY_ADMIN", description: "Manages company configuration and users", isSystemRole: true },
  { name: "Branch Manager", code: "BRANCH_MANAGER", description: "Manages branch operations", isSystemRole: true },
  { name: "Department Head", code: "DEPT_HEAD", description: "Manages department, approval authority", isSystemRole: true },
  { name: "Management", code: "MANAGEMENT", description: "Read-only analytics and approvals", isSystemRole: true },
  { name: "Auditor", code: "AUDITOR", description: "Read-only audit access", isSystemRole: true },
];

// Role → Permission matrix
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["*"], // all permissions
  COMPANY_ADMIN: [
    "auth:session:create",
    "users:user:create", "users:user:read", "users:user:update", "users:user:deactivate",
    "users:user:reset_password", "users:user:assign_role",
    "roles:role:create", "roles:role:read", "roles:role:update", "roles:role:deactivate",
    "roles:permission:assign",
    "company:company:create", "company:company:read", "company:company:update",
    "company:branch:create", "company:branch:read", "company:branch:update", "company:branch:deactivate",
    "company:department:create", "company:department:read", "company:department:update", "company:department:deactivate",
    "employees:employee:create", "employees:employee:read", "employees:employee:update", "employees:employee:deactivate",
    "settings:settings:read", "settings:settings:update",
    "audit:log:read",
    "approvals:workflow:manage", "approvals:request:approve", "approvals:request:read", "approvals:request:cancel",
    "warehouse:warehouse:read", "warehouse:warehouse:create", "warehouse:warehouse:update",
    "warehouse:location:read", "warehouse:location:create", "warehouse:location:update",
    "warehouse:item:read", "warehouse:item:create", "warehouse:item:update",
    "warehouse:uom:read", "warehouse:uom:create", "warehouse:uom:update",
    "warehouse:category:read", "warehouse:category:create", "warehouse:category:update",
    "warehouse:stock:read",
    "warehouse:grn:read", "warehouse:grn:create", "warehouse:grn:confirm",
    "warehouse:transfer:read", "warehouse:transfer:create", "warehouse:transfer:dispatch", "warehouse:transfer:receive",
    "warehouse:adjustment:read", "warehouse:adjustment:create", "warehouse:adjustment:submit", "warehouse:adjustment:approve",
    "transport:vehicle:read", "transport:vehicle:create", "transport:vehicle:update",
    "transport:driver:read", "transport:driver:create", "transport:driver:update",
    "transport:assignment:read", "transport:assignment:create", "transport:assignment:update",
    "transport:trip:read", "transport:trip:create", "transport:trip:update", "transport:trip:dispatch", "transport:trip:complete",
    "transport:incident:read", "transport:incident:create", "transport:incident:update",
    "transport:daily-movement:read", "transport:daily-movement:create", "transport:daily-movement:update",
    "fuel:tank:read", "fuel:tank:create", "fuel:tank:update",
    "fuel:receipt:read", "fuel:receipt:create", "fuel:receipt:confirm",
    "fuel:issue:read", "fuel:issue:create",
    "fuel:price:read", "fuel:price:create",
    "fuel:report:read",
    "maintenance:schedule:read", "maintenance:schedule:create", "maintenance:schedule:update",
    "maintenance:workorder:read", "maintenance:workorder:create", "maintenance:workorder:update", "maintenance:workorder:complete",
    "maintenance:part:read", "maintenance:part:create", "maintenance:part:update",
    "maintenance:receipt:read", "maintenance:receipt:create",
    "maintenance:report:read",
    "procurement:supplier:read", "procurement:supplier:create", "procurement:supplier:update",
    "procurement:request:read", "procurement:request:create", "procurement:request:update", "procurement:request:submit", "procurement:request:approve",
    "procurement:order:read", "procurement:order:create", "procurement:order:update", "procurement:order:send", "procurement:order:receive",
    "procurement:report:read",
    "production:line:read", "production:line:create", "production:line:update",
    "production:recipe:read", "production:recipe:create", "production:recipe:update",
    "production:batch:read", "production:batch:create", "production:batch:update", "production:batch:start", "production:batch:complete",
    "production:report:read",
    "qc:standard:read", "qc:standard:create", "qc:standard:update",
    "qc:test:read", "qc:test:create", "qc:test:update", "qc:test:complete",
    "qc:ncr:read", "qc:ncr:create", "qc:ncr:update", "qc:ncr:resolve",
    "qc:report:read",
    "dispatch:product:read", "dispatch:product:create", "dispatch:product:update",
    "dispatch:lot:read", "dispatch:lot:create", "dispatch:lot:update",
    "dispatch:order:read", "dispatch:order:create", "dispatch:order:update", "dispatch:order:dispatch", "dispatch:order:deliver",
    "dispatch:report:read",
    "finance:account:read", "finance:account:create", "finance:account:update", "finance:account:deactivate",
    "finance:journal:read", "finance:journal:create", "finance:journal:update", "finance:journal:post", "finance:journal:reverse",
    "finance:bank:read", "finance:bank:create", "finance:bank:update", "finance:bank:deactivate",
    "finance:payment:read", "finance:payment:create", "finance:payment:update", "finance:payment:complete", "finance:payment:cancel",
    "finance:report:read",
    "analytics:dashboard:read", "analytics:operations:read", "analytics:financial:read",
    "reports:report:read",
    "tra-stamps:stamp:read", "tra-stamps:stamp:create", "tra-stamps:stamp:activate",
  ],
  BRANCH_MANAGER: [
    "auth:session:create",
    "users:user:read",
    "roles:role:read",
    "company:company:read", "company:branch:read", "company:branch:update",
    "company:department:create", "company:department:read", "company:department:update", "company:department:deactivate",
    "employees:employee:create", "employees:employee:read", "employees:employee:update",
    "approvals:request:approve", "approvals:request:read",
    "warehouse:warehouse:read", "warehouse:warehouse:create", "warehouse:warehouse:update",
    "warehouse:location:read", "warehouse:location:create", "warehouse:location:update",
    "warehouse:item:read", "warehouse:item:create", "warehouse:item:update",
    "warehouse:uom:read", "warehouse:category:read",
    "warehouse:stock:read",
    "warehouse:grn:read", "warehouse:grn:create", "warehouse:grn:confirm",
    "warehouse:transfer:read", "warehouse:transfer:create", "warehouse:transfer:dispatch", "warehouse:transfer:receive",
    "warehouse:adjustment:read", "warehouse:adjustment:create", "warehouse:adjustment:submit", "warehouse:adjustment:approve",
    "transport:vehicle:read", "transport:vehicle:create", "transport:vehicle:update",
    "transport:driver:read", "transport:driver:create", "transport:driver:update",
    "transport:assignment:read", "transport:assignment:create", "transport:assignment:update",
    "transport:trip:read", "transport:trip:create", "transport:trip:update", "transport:trip:dispatch", "transport:trip:complete",
    "transport:incident:read", "transport:incident:create", "transport:incident:update",
    "transport:daily-movement:read", "transport:daily-movement:create", "transport:daily-movement:update",
    "fuel:tank:read", "fuel:tank:create", "fuel:tank:update",
    "fuel:receipt:read", "fuel:receipt:create", "fuel:receipt:confirm",
    "fuel:issue:read", "fuel:issue:create",
    "fuel:price:read", "fuel:price:create",
    "fuel:report:read",
    "maintenance:schedule:read", "maintenance:schedule:create", "maintenance:schedule:update",
    "maintenance:workorder:read", "maintenance:workorder:create", "maintenance:workorder:update", "maintenance:workorder:complete",
    "maintenance:part:read", "maintenance:part:create", "maintenance:part:update",
    "maintenance:receipt:read", "maintenance:receipt:create",
    "maintenance:report:read",
    "procurement:supplier:read", "procurement:supplier:create", "procurement:supplier:update",
    "procurement:request:read", "procurement:request:create", "procurement:request:update", "procurement:request:submit", "procurement:request:approve",
    "procurement:order:read", "procurement:order:create", "procurement:order:update", "procurement:order:send", "procurement:order:receive",
    "procurement:report:read",
    "production:line:read", "production:line:create", "production:line:update",
    "production:recipe:read", "production:recipe:create", "production:recipe:update",
    "production:batch:read", "production:batch:create", "production:batch:update", "production:batch:start", "production:batch:complete",
    "production:report:read",
    "qc:standard:read", "qc:standard:create", "qc:standard:update",
    "qc:test:read", "qc:test:create", "qc:test:update", "qc:test:complete",
    "qc:ncr:read", "qc:ncr:create", "qc:ncr:update", "qc:ncr:resolve",
    "qc:report:read",
    "dispatch:product:read", "dispatch:product:create", "dispatch:product:update",
    "dispatch:lot:read", "dispatch:lot:create", "dispatch:lot:update",
    "dispatch:order:read", "dispatch:order:create", "dispatch:order:update", "dispatch:order:dispatch", "dispatch:order:deliver",
    "dispatch:report:read",
    "finance:account:read", "finance:account:create", "finance:account:update",
    "finance:journal:read", "finance:journal:create", "finance:journal:update",
    "finance:bank:read", "finance:bank:create", "finance:bank:update",
    "finance:payment:read", "finance:payment:create", "finance:payment:update", "finance:payment:complete",
    "finance:report:read",
    "analytics:dashboard:read", "analytics:operations:read",
    "reports:report:read",
    "tra-stamps:stamp:read", "tra-stamps:stamp:create", "tra-stamps:stamp:activate",
  ],
  DEPT_HEAD: [
    "auth:session:create",
    "users:user:read",
    "company:company:read", "company:branch:read", "company:department:read", "company:department:update",
    "employees:employee:read",
    "approvals:request:approve", "approvals:request:read",
    "warehouse:warehouse:read", "warehouse:location:read",
    "warehouse:item:read", "warehouse:uom:read", "warehouse:category:read",
    "warehouse:stock:read",
    "warehouse:grn:read", "warehouse:grn:create",
    "warehouse:transfer:read", "warehouse:transfer:create",
    "warehouse:adjustment:read", "warehouse:adjustment:create", "warehouse:adjustment:submit",
    "transport:vehicle:read", "transport:driver:read", "transport:assignment:read",
    "transport:trip:read", "transport:trip:create", "transport:trip:update", "transport:trip:dispatch",
    "transport:incident:read", "transport:incident:create",
    "transport:daily-movement:read", "transport:daily-movement:create", "transport:daily-movement:update",
    "fuel:tank:read", "fuel:receipt:read", "fuel:issue:read", "fuel:issue:create",
    "fuel:price:read", "fuel:report:read",
    "maintenance:schedule:read", "maintenance:workorder:read", "maintenance:workorder:create", "maintenance:workorder:update",
    "maintenance:part:read", "maintenance:receipt:read", "maintenance:receipt:create",
    "maintenance:report:read",
    "procurement:supplier:read",
    "procurement:request:read", "procurement:request:create", "procurement:request:update", "procurement:request:submit",
    "procurement:order:read",
    "procurement:report:read",
    "production:line:read", "production:recipe:read",
    "production:batch:read", "production:batch:create", "production:batch:update", "production:batch:start", "production:batch:complete",
    "production:report:read",
    "qc:standard:read",
    "qc:test:read", "qc:test:create", "qc:test:update", "qc:test:complete",
    "qc:ncr:read", "qc:ncr:create", "qc:ncr:update", "qc:ncr:resolve",
    "qc:report:read",
    "dispatch:product:read", "dispatch:product:create",
    "dispatch:lot:read", "dispatch:lot:create", "dispatch:lot:update",
    "dispatch:order:read", "dispatch:order:create", "dispatch:order:update", "dispatch:order:dispatch", "dispatch:order:deliver",
    "dispatch:report:read",
    "finance:account:read", "finance:account:create",
    "finance:journal:read", "finance:journal:create",
    "finance:bank:read", "finance:bank:create",
    "finance:payment:read", "finance:payment:create",
    "finance:report:read",
    "analytics:dashboard:read", "analytics:operations:read", "analytics:financial:read",
    "reports:report:read",
  ],
  MANAGEMENT: [
    "auth:session:create",
    "users:user:read",
    "company:company:read", "company:branch:read", "company:department:read",
    "employees:employee:read",
    "audit:log:read",
    "approvals:request:approve", "approvals:request:read",
    "warehouse:warehouse:read", "warehouse:location:read",
    "warehouse:item:read", "warehouse:uom:read", "warehouse:category:read",
    "warehouse:stock:read",
    "warehouse:grn:read", "warehouse:transfer:read", "warehouse:adjustment:read",
    "transport:vehicle:read", "transport:driver:read", "transport:trip:read", "transport:incident:read",
    "transport:daily-movement:read",
    "fuel:tank:read", "fuel:receipt:read", "fuel:issue:read", "fuel:price:read", "fuel:report:read",
    "maintenance:schedule:read", "maintenance:workorder:read", "maintenance:part:read", "maintenance:report:read",
    "procurement:supplier:read", "procurement:request:read", "procurement:request:approve",
    "procurement:order:read", "procurement:report:read",
    "production:line:read", "production:recipe:read", "production:batch:read", "production:report:read",
    "qc:standard:read", "qc:test:read", "qc:ncr:read", "qc:report:read",
    "dispatch:product:read", "dispatch:lot:read",
    "dispatch:order:read", "dispatch:order:dispatch", "dispatch:order:deliver",
    "dispatch:report:read",
    "finance:account:read",
    "finance:journal:read",
    "finance:bank:read",
    "finance:payment:read",
    "finance:report:read",
    "analytics:dashboard:read", "analytics:operations:read", "analytics:financial:read",
    "reports:report:read",
    "tra-stamps:stamp:read",
  ],
  AUDITOR: [
    "auth:session:create",
    "users:user:read",
    "roles:role:read",
    "company:company:read", "company:branch:read", "company:department:read",
    "employees:employee:read",
    "audit:log:read",
    "approvals:request:read",
    "warehouse:warehouse:read", "warehouse:location:read",
    "warehouse:item:read", "warehouse:uom:read", "warehouse:category:read",
    "warehouse:stock:read",
    "warehouse:grn:read", "warehouse:transfer:read", "warehouse:adjustment:read",
    "transport:vehicle:read", "transport:driver:read", "transport:trip:read", "transport:incident:read",
    "transport:daily-movement:read",
    "fuel:tank:read", "fuel:receipt:read", "fuel:issue:read", "fuel:price:read", "fuel:report:read",
    "maintenance:schedule:read", "maintenance:workorder:read", "maintenance:part:read", "maintenance:report:read",
    "procurement:supplier:read", "procurement:request:read",
    "procurement:order:read", "procurement:report:read",
    "production:line:read", "production:recipe:read", "production:batch:read", "production:report:read",
    "qc:standard:read", "qc:test:read", "qc:ncr:read", "qc:report:read",
    "dispatch:product:read", "dispatch:lot:read",
    "dispatch:order:read", "dispatch:report:read",
    "finance:account:read",
    "finance:journal:read",
    "finance:bank:read",
    "finance:payment:read",
    "finance:report:read",
    "analytics:dashboard:read", "analytics:operations:read", "analytics:financial:read",
    "tra-stamps:stamp:read",
  ],
};

// ─── Seed data ────────────────────────────────────────────
const DEFAULT_SETTINGS = [
  { key: "auth.session_timeout_minutes", value: "480", category: "auth", description: "Session duration in minutes (default 8 hours)", isPublic: false },
  { key: "auth.remember_me_days", value: "30", category: "auth", description: "Remember me session duration in days", isPublic: false },
  { key: "auth.max_sessions_per_user", value: "5", category: "auth", description: "Maximum concurrent sessions per user", isPublic: false },
  { key: "auth.password_min_length", value: "8", category: "auth", description: "Minimum password length", isPublic: false },
  { key: "auth.login_lockout_attempts", value: "5", category: "auth", description: "Failed attempts before lockout (0 = disabled)", isPublic: false },
  { key: "auth.login_lockout_minutes", value: "15", category: "auth", description: "Lockout duration in minutes", isPublic: false },
  { key: "general.date_format", value: "YYYY-MM-DD", category: "general", description: "Date display format", isPublic: true },
  { key: "general.time_format", value: "24h", category: "general", description: "Time display format (12h or 24h)", isPublic: true },
  { key: "general.app_version", value: "1.0.0", category: "general", description: "Application version", isPublic: true },
];

const DEPARTMENTS = [
  { name: "Administration", code: "ADMIN" },
  { name: "Operations", code: "OPS" },
  { name: "Finance", code: "FIN" },
  { name: "Warehouse", code: "WH" },
  { name: "Transport", code: "TRANS" },
  { name: "Production", code: "PROD" },
  { name: "Quality Control", code: "QC" },
  { name: "Maintenance", code: "MAINT" },
  { name: "Procurement", code: "PROC" },
  { name: "Human Resources", code: "HR" },
];

async function main() {
  console.log("🌱 Starting database seed...");

  // ── 1. Company ───────────────────────────────────────────
  console.log("  → Creating company...");
  const company = await db.company.upsert({
    where: { id: "company_main" },
    update: {},
    create: {
      id: "company_main",
      name: "Your Company Name",
      currency: "TZS",
      dateFormat: "YYYY-MM-DD",
      fiscalYearStart: 1,
    },
  });

  // ── 2. Main Branch ───────────────────────────────────────
  console.log("  → Creating main branch...");
  const branch = await db.branch.upsert({
    where: { code: "HQ" },
    update: {},
    create: {
      companyId: company.id,
      name: "Head Office",
      code: "HQ",
      isMain: true,
      createdById: "system",
    },
  });

  // ── 3. Departments ───────────────────────────────────────
  console.log("  → Creating departments...");
  for (const dept of DEPARTMENTS) {
    await db.department.upsert({
      where: { code: dept.code },
      update: {},
      create: {
        companyId: company.id,
        branchId: branch.id,
        name: dept.name,
        code: dept.code,
        createdById: "system",
      },
    });
  }

  // ── 4. Settings ──────────────────────────────────────────
  console.log("  → Creating settings...");
  for (const setting of DEFAULT_SETTINGS) {
    await db.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        ...setting,
        companyId: company.id,
        updatedById: "system",
      },
    });
  }

  // ── 5. Permissions ───────────────────────────────────────
  console.log("  → Creating permissions...");
  const permissionMap: Record<string, string> = {};
  for (const perm of PERMISSIONS) {
    const existing = await db.permission.upsert({
      where: { module_resource_action: { module: perm.module, resource: perm.resource, action: perm.action } },
      update: { description: perm.description },
      create: perm,
    });
    permissionMap[`${perm.module}:${perm.resource}:${perm.action}`] = existing.id;
  }

  // ── 6. Roles ─────────────────────────────────────────────
  console.log("  → Creating roles...");
  const roleMap: Record<string, string> = {};
  for (const role of ROLES) {
    const existing = await db.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: { ...role, createdById: "system" },
    });
    roleMap[role.code] = existing.id;
  }

  // ── 7. Role Permissions ──────────────────────────────────
  console.log("  → Assigning role permissions...");
  for (const [roleCode, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap[roleCode];
    if (!roleId) continue;

    if (perms.includes("*")) {
      // Super admin: assign all permissions
      const allPermIds = Object.values(permissionMap);
      await db.rolePermission.deleteMany({ where: { roleId } });
      if (allPermIds.length > 0) {
        await db.rolePermission.createMany({
          data: allPermIds.map((permissionId) => ({ roleId, permissionId, grantedById: "system" })),
        });
      }
    } else {
      await db.rolePermission.deleteMany({ where: { roleId } });
      const permIds = perms.map((p) => permissionMap[p]).filter(Boolean);
      if (permIds.length > 0) {
        await db.rolePermission.createMany({
          data: permIds.map((permissionId) => ({ roleId, permissionId, grantedById: "system" })),
        });
      }
    }
  }

  // ── 8. Superadmin User ───────────────────────────────────
  console.log("  → Creating admin user...");
  const passwordHash = await bcrypt.hash("Admin@1234", 12);
  const adminUser = await db.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@company.local",
      fullName: "System Administrator",
      passwordHash,
      isSystemUser: true,
      mustChangePassword: true,
    },
  });

  // Assign SUPER_ADMIN role
  const superAdminRoleId = roleMap["SUPER_ADMIN"];
  if (superAdminRoleId) {
    const existingRole = await db.userRole.findFirst({
      where: { userId: adminUser.id, roleId: superAdminRoleId, branchId: null },
    });
    if (!existingRole) {
      await db.userRole.create({
        data: { userId: adminUser.id, roleId: superAdminRoleId, assignedById: "system" },
      });
    }
  }

  // ── 9. Exchange Rates ────────────────────────────────────
  console.log("  → Creating exchange rates...");
  const rates = [
    { fromCurrency: "USD", toCurrency: "TZS", rate: 2600, source: "MANUAL" },
    { fromCurrency: "EUR", toCurrency: "TZS", rate: 2800, source: "MANUAL" },
    { fromCurrency: "GBP", toCurrency: "TZS", rate: 3300, source: "MANUAL" },
    { fromCurrency: "KES", toCurrency: "TZS", rate: 20,   source: "MANUAL" },
  ];
  for (const r of rates) {
    await db.exchangeRate.upsert({
      where: {
        companyId_fromCurrency_toCurrency_effectiveDate: {
          companyId: company.id,
          fromCurrency: r.fromCurrency,
          toCurrency: r.toCurrency,
          effectiveDate: new Date(),
        },
      },
      update: { rate: r.rate },
      create: {
        companyId: company.id,
        fromCurrency: r.fromCurrency,
        toCurrency: r.toCurrency,
        rate: r.rate,
        source: r.source,
        effectiveDate: new Date(),
        createdById: "system",
      },
    });
  }

  console.log("");
  console.log("✅ Seed complete!");
  console.log("");
  console.log("   Default login:");
  console.log("   Username : admin");
  console.log("   Password : Admin@1234");
  console.log("   ⚠️  You will be forced to change this password on first login.");
  console.log("");
  console.log(`   Company: ${company.name}`);
  console.log(`   Branch:  ${branch.name} (${branch.code})`);
  console.log(`   Roles:   ${Object.keys(roleMap).join(", ")}`);
  console.log(`   Perms:   ${Object.keys(permissionMap).length} permissions seeded`);
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => db.$disconnect());
