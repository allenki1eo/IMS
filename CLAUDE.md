# IMS - Company ERP System

## Project Overview

A modular, phased ERP for a manufacturing/distribution company. Built with Next.js 15, TypeScript, Prisma, Turso/libSQL/SQLite, and Tailwind CSS plus shadcn-style UI primitives.

**Current Phase: Phase 5 - Maintenance & Spare Parts complete**

The application now includes the core ERP foundation, Warehouse Management, Transport & Fleet, Fuel Management, and Maintenance & Spare Parts modules.

## Architecture

```
src/
├── app/
│   ├── (auth)/          # Login, change-password (public)
│   ├── (dashboard)/     # Protected pages (sidebar layout)
│   └── api/             # REST API route handlers
├── modules/             # Business logic services (no UI imports)
├── lib/                 # Infrastructure: db, auth, session, audit, response helpers
├── components/
│   ├── layout/          # DashboardShell, Sidebar, Navbar, SyncStatus, UserMenu
│   ├── ui/              # shadcn-style UI primitives
│   └── shared/          # DataTable, PageHeader, StatusBadge, PermissionGuard, etc.
├── hooks/               # useCurrentUser, usePermission, useLocalDraft, useOnlineStatus
└── types/               # TypeScript type definitions
```

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Turso (libSQL/SQLite) |
| ORM | Prisma |
| Auth | JWT in HttpOnly cookies |
| UI | Tailwind CSS + shadcn-style primitives |
| Forms | react-hook-form + zod where used; local form state in module pages |
| Toasts | sonner |
| Charts / reports | Recharts dependency available; current reports use tables |

## Development

```bash
# Install
npm install

# Setup database (local SQLite for dev)
DATABASE_URL="file:./dev.db" npx prisma db push
DATABASE_URL="file:./dev.db" npm run db:seed

# Run dev server
npm run dev

# Generate Prisma client after schema changes
npm run db:generate
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks the `npm.ps1` shim.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
DATABASE_URL        - libSQL connection string (file:./dev.db for local)
DATABASE_AUTH_TOKEN - Turso auth token (empty for local sqld)
JWT_SECRET          - 64+ char random string
BASE_URL            - App base URL
```

## Database

Uses Turso/libSQL, which is SQLite-compatible.

**Local/LAN:** `DATABASE_URL="file:./dev.db"` or point to a local `sqld` server.
**Cloud:** `DATABASE_URL="libsql://your-db.turso.io"` with auth token.
**Self-hosted:** Run `sqld` via Docker (see `docker/docker-compose.yml`).

After any schema change:

```bash
DATABASE_URL="file:./dev.db" npx prisma db push
```

## Seed Data

```bash
DATABASE_URL="file:./dev.db" npm run db:seed
```

Creates:

- Company: "Your Company Name"
- Branch: Head Office (HQ)
- Departments: Admin, Operations, Finance, Warehouse, Transport, Production, QC, Maintenance, Procurement, HR
- Roles: Super Admin, Company Admin, Branch Manager, Dept Head, Management, Auditor
- Permissions for Core, Warehouse, Transport, and Fuel modules
- Admin user: `admin` / `Admin@1234` (forced password change on first login)

## Authentication

- JWT stored in HttpOnly Secure SameSite cookie (`erp_session`)
- Sessions tracked in DB and can be revoked
- `mustChangePassword=true` forces password change before any other action
- Middleware validates JWT and session on every request
- Permissions fetched from DB on each request and never stored in the token

## Permissions

Pattern: `module:resource:action`

Check in API routes:

```typescript
const auth = await requirePermission(request, "users:user:create");
if ("error" in auth) return auth.error;
// auth.user is AuthUser
```

Check in UI:

```tsx
<PermissionGuard require="users:user:create">
  <Button>Add User</Button>
</PermissionGuard>
```

## Audit Logs

Every write operation should call `createAuditLog()`. Logs are append-only. Passwords and tokens are never logged.

```typescript
await createAuditLog({
  userId,
  userName,
  action: "USER_CREATE",
  module: "users",
  resource: "user",
  recordId: user.id,
  newValue: { username, email },
  description: "Created user",
  ipAddress,
  userAgent,
});
```

## Implemented Modules

### Phase 1 - Core Foundation

Status: Complete

- Auth: login, logout, current user, password change, session revocation
- Middleware-protected dashboard routes
- Users, roles, permissions, role assignment, password reset, activation/deactivation
- Company profile, branches, departments, employees
- Settings, audit log viewer, dashboard stats
- Approval workflows and approval request lifecycle
- Shared layout, sidebar, navbar, status badges, tables, search, permission guards, loading/empty states

### Phase 2 - Warehouse Management

Status: Complete

- Prisma schema for warehouses, storage locations, item categories, UOMs, items, stock balances, stock ledger, GRNs, stock transfers, and adjustments
- Services and API routes for warehouse master data and stock operations
- Dashboard UI for warehouse overview, warehouses, items, categories, UOMs, stock, GRNs, transfers, and adjustments
- GRN confirmation updates stock
- Transfer dispatch/receive workflows
- Adjustment submission/application workflow hooks

### Phase 3 - Transport & Fleet

Status: Complete

- Prisma schema for vehicles, vehicle documents, drivers, vehicle assignments, trip orders, trip logs, trip cargo, and incidents
- Services and API routes for vehicles, drivers, assignments, trips, trip lifecycle actions, trip logs, and incidents
- Dashboard UI for transport overview, vehicles, drivers, assignments, trips, and incidents
- Trip dispatch, completion, and cancellation actions
- Vehicle odometer and availability/status updates

### Phase 4 - Fuel Management

Status: Complete

- Prisma schema for fuel tanks, fuel receipts, fuel issues, and fuel prices
- Seeded permissions and sidebar navigation for Fuel
- Services and API routes for:
  - Fuel tanks: list, create, detail, update, activate/deactivate
  - Fuel receipts: list, create, detail, confirm into tank
  - Fuel issues: list, create, detail, vehicle assignment, tank deduction, odometer update
  - Fuel prices: list, create, current price lookup
  - Reports: consumption by vehicle, consumption by period, tank level history
- Dashboard UI for:
  - Fuel overview
  - Tanks list, create, detail, and status control
  - Receipts list, create, detail, and confirmation
  - Issues list, create, and detail
  - Prices list and price recording
  - Consumption reports by vehicle and period

### Phase 5 - Maintenance & Spare Parts

Status: Complete

- Prisma schema for maintenance schedules, work orders, work order items, spare part categories, spare parts, and spare part transactions
- Seeded permissions and sidebar navigation for Maintenance
- Services and API routes for:
  - Maintenance schedules: list, create, detail, update, vehicle linkage, frequency, and due tracking
  - Work orders: list, create, detail, update, start, complete, cancel, and item usage
  - Spare parts: list, create, detail, update, categories, stock levels, and receipt history
  - Parts receipts: receive spare parts into stock and record stock transactions
- Dashboard UI for:
  - Maintenance overview
  - Work orders list, create, detail, lifecycle actions, and consumed parts
  - Schedules list, create, and detail
  - Spare parts list, create, detail, and stock/transaction views
  - Parts receipts list

## Module Roadmap

| Phase | Module | Status |
|---|---|---|
| 1 | Core Foundation (Auth, Users, Roles, Company, Employees) | Complete |
| 2 | Warehouse Management | Complete |
| 3 | Transport & Fleet | Complete |
| 4 | Fuel Management | Complete |
| 5 | Maintenance & Spare Parts | Complete |
| 6 | Procurement | Planned |
| 7 | Production & Brewing | Planned |
| 8 | Quality Control & Lab | Planned |
| 9 | Finished Goods & Dispatch | Planned |
| 10 | Sales Integration | Planned |
| 11 | HR Integration | Planned |
| 12 | Finance Operations | Planned |
| 13 | Management Analytics | Planned |

## Adding a New Module (Phases 6+)

1. Create `src/modules/{module}/` with `{module}.service.ts`, `.validation.ts`, and `.types.ts` as needed.
2. Add API routes under `src/app/api/{module}/`.
3. Add UI pages under `src/app/(dashboard)/{module}/`.
4. Add permissions to `prisma/seed.ts` and run seed.
5. Add sidebar nav items in `src/components/layout/Sidebar.tsx`.
6. Connect to approval workflows when business rules require review/authorization.
7. All writes must call `createAuditLog()`.

## Deployment

### Local / LAN

```bash
cd docker
docker compose up -d
docker exec ims_app npx prisma db push
docker exec ims_app npm run db:seed
```

Access: `http://<server-ip>:3000`

### Coolify / VPS

1. Push to GitHub.
2. Create service in Coolify pointing to this repo.
3. Set Dockerfile path: `docker/Dockerfile`.
4. Set all environment variables in Coolify.
5. Mount volume to `/app/uploads`.
6. Enable auto-deploy on push.

## Key Design Decisions

- No database arrays: join tables are used for many-to-many relationships for SQLite compatibility.
- Permissions are not stored in JWTs: they are fetched from DB for real-time role revocation.
- Audit logs are append-only: no update/delete operations on `audit_logs`.
- String enums are used instead of Prisma enums for SQLite compatibility.
- `useLocalDraft` is available for form state persistence during disconnects.
- Optimistic UI is avoided for financial, stock, approval, and fuel records where consistency matters more than speed.

