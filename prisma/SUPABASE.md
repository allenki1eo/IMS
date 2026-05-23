# Supabase Postgres Setup

This project now uses Prisma with PostgreSQL for Supabase.

## Environment variables

Use two database URLs:

- `DATABASE_URL`: Supabase Transaction Pooler URL for the running app.
- `DIRECT_URL`: Supabase direct database URL for Prisma migrations and schema changes.

Example:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
```

## Option A: Run SQL in Supabase

Open the Supabase SQL editor and run:

```text
prisma/supabase-schema.sql
```

That file contains the complete database schema from the current Prisma models.

## Option B: Run Prisma migrations

Set `DATABASE_URL` and `DIRECT_URL`, then run:

```bash
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
```

The matching migration SQL is also stored at:

```text
prisma/migrations/000001_init_supabase_postgres/migration.sql
```

## Supabase notes

- Keep Row Level Security disabled for these application-owned ERP tables unless the app is later refactored to use Supabase Auth and RLS policies.
- Use `DIRECT_URL` only for migrations or local admin work.
- Use the pooled `DATABASE_URL` in Vercel/production runtime environments.
