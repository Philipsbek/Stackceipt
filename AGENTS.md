# AGENTS.md — Stackceipt operating manual

Durable instructions for coding agents working in this repo. Read this before changing anything.

## What Stackceipt is

A multi-tenant B2B SaaS that helps SMBs track software subscriptions, renewals, approvals,
reviews, offboarding, and deterministic cost-control findings. Tagline: **"Know what your
software stack is costing you."** The authenticated app is the product; the landing page is
intentionally compact.

### V1 boundaries (do NOT add)
No AI/LLM features, no payments/billing of Stackceipt customers, no email integrations, no
bank/accounting/expense feeds, no SSO/directory sync, no native mobile, no CMS/blog, no
speculative microservices. Organization invites are copyable links only — no outbound email.

## Package manager

**npm only.** The committed lockfile is `package-lock.json`. Do not introduce pnpm/yarn/bun.

## Commands

| Task | Command |
| --- | --- |
| Install | `npm install` |
| Dev server | `npm run dev` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit tests | `npm test` |
| Production build | `npm run build` |
| Seed (dev only) | `npm run seed` (needs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) |
| Apply migrations | `supabase db push` (or `supabase migration up` locally) |
| Generate DB types | `supabase gen types typescript --linked > src/lib/supabase/types.ts` |

Run typecheck + lint + unit tests before considering a change done. Run the build when the
change affects production compilation.

## Architecture

- **Next.js App Router**, Server Components by default. Add `"use client"` only at real
  interactive boundaries (forms, dialogs, filter toolbars).
- **Supabase** for Postgres, Auth, RLS, and private Storage. SQL migrations in
  `supabase/migrations/` are the schema source of truth — never edit the DB out of band.
- **Supabase clients**: `src/lib/supabase/server.ts` (RSC/actions), `client.ts` (browser),
  `middleware.ts` (session refresh + route guard). Use the SSR cookie pattern; never expose
  the service-role key to the browser.
- **Data-access seam**: `src/lib/data/*` is the ONLY place the UI reads data. Today it reads
  the in-memory demo dataset (`src/lib/demo/data.ts`) so the app runs without a backend. To go
  live, repoint `getSession()`/`getOrgContext()` and the query functions at Supabase — the UI
  and domain layers do not change.
- **Domain logic** lives in `src/lib/domain/*` (pure, unit-tested): `money`, `dates`, `seats`,
  `permissions`, `janitor`, `validation`, `csv`, `enums`, `types`. Keep business rules here and
  in database functions — never in page components.

## Authorization (two independent layers)

1. **Centralized permission catalog** — `src/lib/domain/permissions.ts` `can()/authorize()`.
   Used for nav visibility AND the first server-side check. UI hiding is never security.
2. **Postgres RLS** — the independent tenant backstop (`0003_rls.sql`). Every mutation must
   also pass RLS. Helper functions (`is_org_member`, `is_org_owner_admin`, `is_org_staff`,
   `manages_department`, `can_read_subscription`) are `SECURITY DEFINER` with locked
   `search_path` to avoid recursive RLS.

Write model (as of 0006): **Owner/Admin only** may create/edit subscriptions, decide requests,
manage departments/reviews/offboarding/Janitor and documents. Managers keep oversight READ access
(inventory, reviews, offboarding, Janitor, reports) and may submit their own requests, but have no
write/approve rights. Members complete tasks/reviews explicitly assigned to them. Both layers
enforce this: `permissions.ts` and RLS (see `0006_owner_admin_writes.sql`).

Invariants: exactly one active OWNER per org; self-approval of requests is impossible for every
role; suspended/removed members lose access; audit logs are append-only for normal roles;
private documents require a fresh auth check + short-lived signed URL.

## Money, currency, dates

- Money is integer **minor units** (`bigint` in DB, guarded `number` in TS). Never floats.
- Every monetary row carries a 3-letter uppercase currency. V1 is single-currency per org.
- Normalization lives in `src/lib/domain/money.ts`: monthly×12, quarterly×4, annual×1,
  custom = amount×12÷interval (multiply before divide, round half-up); one-time excluded from
  recurring totals. Labels: "Monthly recurring", "Annual committed", "One-time spend",
  "Potential savings" (only when mechanically supportable).
- Business dates are calendar-only (`date`), computed on UTC anchors (`dates.ts`). Timestamps
  are UTC; display in the org timezone.

## Database migrations

- Ordered files in `supabase/migrations/` (`0001_init` → `0007_invitations`). Must apply cleanly
  to a fresh database. Add a new numbered file per change; do not rewrite applied migrations.
- Every tenant table carries `organization_id` directly. Add indexes for org filtering + common
  status/date queries. Keep enums in sync with `src/lib/domain/enums.ts`.

## Audit & private documents

- Record security/business events in `audit_logs` via `SECURITY DEFINER` functions only; never
  trust a client-supplied actor. Redact secrets and raw invite tokens.
- Documents live in the private `subscription-documents` bucket. Paths are
  `{org}/{subscription}/{uuid}-{filename}`. Bucket is never public.

## Do NOT

- Invent credentials, project refs, DNS values, or "successful" deploys.
- Bypass RLS with a broad privileged function, or trust a client `organization_id`.
- Add out-of-scope integrations (see V1 boundaries).
- Perform destructive git/database operations without explicit approval.
