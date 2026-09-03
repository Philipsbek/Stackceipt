# Stackceipt

**Know what your software stack is costing you.**

Stackceipt is a multi-tenant B2B SaaS that gives small and medium businesses one reliable place
to track software subscriptions, annualized cost, renewals, ownership, seat allocation, purchase
requests, periodic reviews, employee offboarding, and deterministic cost-control findings.

> **Build status:** This repository is a working V1. The application runs today on a deterministic
> in-memory demo dataset so it is fully explorable without a backend. The complete Supabase schema,
> Row Level Security policies, auth/SSR wiring, and dev seed are included and ready to switch on —
> see [Going live with Supabase](#going-live-with-supabase). Live auth/RLS were not exercised in the
> build environment (no local Supabase/Docker available), so those steps are documented, not claimed.

## Features (V1)

- **Subscription inventory** — searchable, filterable, sortable; true monthly & annualized cost.
- **Role-aware dashboard** — recurring cost, renewals, open requests, reviews, findings, offboarding.
- **Requests & approvals** — draft → submit → decide → convert, with self-approval blocked.
- **Renewals & reviews** — notice-deadline math, urgency grouping, scheduled reviews.
- **Team & invitations** — copyable single-use invite links (no email needed), role management.
- **Departments** — spend attribution and manager scope.
- **Offboarding** — auto-generated seat-reclaim checklists per departing member.
- **Deterministic Janitor** — 12 unit-tested rules (no AI) for waste, risk, and data quality.
- **Reports** — spend, utilization, outcomes; formula-injection-safe CSV export.
- **In-app notifications, audit log, private documents.**

### Explicit non-goals
No AI features, no payments/billing, no email/Slack/SSO integrations, no bank/accounting feeds,
no native mobile, no CMS/blog. (See `AGENTS.md`.)

## Stack

Next.js (App Router) · TypeScript (strict) · React 19 · Tailwind CSS v4 · shadcn/ui · Lucide ·
Supabase (Postgres + Auth + RLS + Storage) · Vitest · Vercel · Cloudflare (DNS).

## Prerequisites

- Node.js 20+ and npm.
- (For the backend) a Supabase project, and optionally the Supabase CLI + Docker for local dev.

## Local development

```bash
npm install
npm run dev            # http://localhost:3000
```

The app boots on demo data. Explore the worked example org at `/app/northwind`.

### Quality gates

```bash
npm run typecheck
npm run lint
npm test               # 66 domain unit tests (money, dates, permissions, janitor, csv)
npm run build
```

## Environment configuration

Copy `.env.example` to `.env.local` and fill in values. Real `.env*` files are gitignored;
`.env.example` stays committed.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser-safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/publishable key (browser-safe; RLS protects data) |
| `NEXT_PUBLIC_APP_URL` | App base URL for callbacks (no trailing slash) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only.** Used by the dev seed script only |
| `SUPABASE_URL` | Non-public project URL for the seed script |
| `CRON_SECRET` | Optional shared secret for the daily Janitor cron |

## Going live with Supabase

1. **Create a project** at supabase.com and copy the URL + anon key into `.env.local`.
2. **Apply migrations** (fresh DB): with the Supabase CLI linked to your project,
   `supabase db push`. Migrations live in `supabase/migrations/` and create the schema,
   functions, RLS, and the private `subscription-documents` bucket.
3. **Generate types** (optional, recommended):
   `supabase gen types typescript --linked > src/lib/supabase/types.ts`.
4. **Seed dev data** (disposable projects only):
   `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed`.
   Log in with any seeded email and password `Stackceipt!Demo1`.
5. **Switch the data layer to Supabase.** The UI reads only through `src/lib/data/*`. Repoint
   `getSession()` and `getOrgContext()` in `src/lib/data/access.ts` at
   `createClient()` + `supabase.auth.getUser()`, and replace the demo queries with Supabase
   queries returning the same view-model shapes (`src/lib/domain/types.ts`). No UI changes needed.

### Auth redirect configuration
In Supabase → Authentication → URL Configuration set:
- **Site URL**: your production URL (e.g. `https://stackceipt.com`).
- **Redirect URLs**: `http://localhost:3000/auth/callback`, your Vercel preview pattern, and
  `https://stackceipt.com/auth/callback`.

### Private document storage
The `subscription-documents` bucket is created by `0004_storage.sql` as **private** with size and
MIME allowlists. The app must generate short-lived signed URLs after a fresh authorization check.
Never make the bucket public.

## Deployment (Vercel + Cloudflare)

1. Import the repo into Vercel. Build command `next build`, install `npm install` (lockfile committed).
2. Add the environment variables above in Vercel (Production + Preview). Do **not** set
   `SUPABASE_SERVICE_ROLE_KEY` unless a server-only feature needs it; never prefix it `NEXT_PUBLIC`.
3. Deploy and run a smoke test: sign in, load a dashboard, open a subscription, confirm a tenant
   cannot reach another org's slug.
4. **Custom domain**: add it in Vercel → Domains, then create the exact DNS records Vercel supplies
   in Cloudflare. Follow Vercel's current guidance on proxy (orange-cloud) vs DNS-only mode; verify
   TLS and the canonical (apex ↔ www) redirect.

### Optional: daily Janitor cron
If enabled, add a Vercel Cron hitting the protected endpoint with `CRON_SECRET`. It must be
idempotent and disable gracefully when the secret is unset.

## Security notes & limitations

- RLS is enabled on every table with default-deny; helper functions are hardened
  (`SECURITY DEFINER`, locked `search_path`). See `supabase/migrations/0003_rls.sql`.
- Stackceipt tracks offboarding but **cannot revoke access in third-party vendor systems** in V1.
- Live auth/RLS/storage were not exercised in the build environment; validate them against your
  project before production (see the RLS test guidance in `AGENTS.md`).

## License

Proprietary demo build.
