# IMS — Company ERP System

## Project Overview

A modular, phased ERP for a manufacturing/distribution company. Built with Next.js 15, TypeScript, Prisma, Turso (libSQL/SQLite), and Tailwind CSS + shadcn/ui.

**Current Phase: Phase 1 — Core Foundation**

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
│   ├── ui/              # shadcn/ui primitives
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
| UI | Tailwind CSS + shadcn/ui |
| Forms | react-hook-form + zod |
| Toasts | sonner |
| Charts | recharts (future phases) |

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

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
DATABASE_URL        — libSQL connection string (file:./dev.db for local)
DATABASE_AUTH_TOKEN — Turso auth token (empty for local sqld)
JWT_SECRET          — 64+ char random string
BASE_URL            — App base URL
```

## Database

Uses Turso (libSQL) — SQLite-compatible.

**Local/LAN:** `DATABASE_URL="file:./dev.db"` or point to a local `sqld` server.
**Cloud:** `DATABASE_URL="libsql://your-db.turso.io"` with auth token.
**Self-hosted:** Run `sqld` via Docker (see docker/docker-compose.yml).

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
- All Phase 1 permissions (32 permissions)
- Admin user: `admin` / `Admin@1234` (forced password change on first login)

## Authentication

- JWT stored in HttpOnly Secure SameSite cookie (`erp_session`)
- Sessions tracked in DB — can be revoked
- `mustChangePassword=true` forces change before any other action
- Middleware validates JWT and session on every request
- Permissions fetched from DB on each request (never stored in token)

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

Every write operation calls `createAuditLog()`. Logs are append-only. Passwords and tokens are never logged.

```typescript
await createAuditLog({
  userId, userName, action: "USER_CREATE",
  module: "users", resource: "user",
  recordId: user.id,
  newValue: { username, email },
  description: "Created user",
  ipAddress, userAgent,
});
```

## Adding a New Module (Phases 2+)

1. Create `src/modules/{module}/` with `{module}.service.ts`, `.validation.ts`, `.types.ts`
2. Add API routes under `src/app/api/{module}/`
3. Add UI pages under `src/app/(dashboard)/{module}/`
4. Add permissions to `prisma/seed.ts` and run seed
5. Add sidebar nav item in `src/components/layout/Sidebar.tsx`
6. Connect to approval system if needed via `approvalsService.createRequest()`
7. All writes must call `createAuditLog()`

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
1. Push to GitHub
2. Create service in Coolify pointing to this repo
3. Set Dockerfile path: `docker/Dockerfile`
4. Set all env vars in Coolify
5. Mount volume to `/app/uploads`
6. Enable auto-deploy on push

## Module Roadmap

| Phase | Module | Status |
|---|---|---|
| 1 | Core Foundation (Auth, Users, Roles, Company, Employees) | ✅ Complete |
| 2 | Warehouse Management | Planned |
| 3 | Transport & Fleet | Planned |
| 4 | Fuel Management | Planned |
| 5 | Maintenance & Spare Parts | Planned |
| 6 | Procurement | Planned |
| 7 | Production & Brewing | Planned |
| 8 | Quality Control & Lab | Planned |
| 9 | Finished Goods & Dispatch | Planned |
| 10 | Sales Integration | Planned |
| 11 | HR Integration | Planned |
| 12 | Finance Operations | Planned |
| 13 | Management Analytics | Planned |

## Key Design Decisions

- **No database arrays** — using join tables for many-to-many relationships (SQLite compatible)
- **Permissions NOT in JWT** — always fetched from DB to allow real-time role revocation
- **Append-only audit logs** — no UPDATE/DELETE on `audit_logs` table
- **String enums** — using plain strings instead of Prisma enums for SQLite compatibility
- **Draft saving** — `useLocalDraft` hook saves form state to localStorage to survive disconnects
- **Optimistic UI avoided** for financial/stock/approval records — consistency > speed
