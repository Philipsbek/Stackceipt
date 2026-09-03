-- Stackceipt — initial schema
-- Extensions, enums, tables, constraints, indexes, and shared updated_at trigger.
-- The database is the source of truth; src/lib/domain/enums.ts mirrors these enums.

-- ── Extensions ─────────────────────────────────────────────────────
create extension if not exists pgcrypto;   -- gen_random_uuid(), digest()
create extension if not exists citext;      -- case-insensitive slugs/emails

-- ── Enums ──────────────────────────────────────────────────────────
create type organization_role as enum ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER');
create type membership_status as enum ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');
create type subscription_status as enum ('ACTIVE', 'TRIAL', 'PAUSED', 'CANCELLED', 'ARCHIVED');
create type billing_cadence as enum ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM', 'ONE_TIME');
create type request_status as enum ('DRAFT', 'SUBMITTED', 'APPROVED', 'DENIED', 'CANCELLED');
create type review_status as enum ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type review_decision as enum ('KEEP', 'CANCEL', 'RENEGOTIATE', 'REDUCE_SEATS', 'INCREASE_SEATS');
create type offboarding_status as enum ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type offboarding_task_status as enum ('PENDING', 'COMPLETED', 'CANCELLED');
create type janitor_severity as enum ('INFO', 'LOW', 'MEDIUM', 'HIGH');
create type janitor_finding_status as enum ('OPEN', 'RESOLVED', 'DISMISSED');
create type notification_type as enum (
  'REQUEST_SUBMITTED', 'REQUEST_DECIDED', 'REQUEST_CANCELLED', 'REQUEST_CONVERTED',
  'REVIEW_ASSIGNED', 'REVIEW_DUE', 'REVIEW_COMPLETED', 'RENEWAL_APPROACHING',
  'OFFBOARDING_ASSIGNED', 'OFFBOARDING_COMPLETED', 'JANITOR_FINDING', 'MEMBERSHIP_CHANGED'
);

-- ── Shared updated_at trigger ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles ───────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── organizations ──────────────────────────────────────────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  slug citext not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  base_currency char(3) not null check (base_currency ~ '^[A-Z]{3}$'),
  timezone text not null,
  renewal_window_days integer not null default 90 check (renewal_window_days between 1 and 365),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- ── organization_members ───────────────────────────────────────────
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  role organization_role not null default 'MEMBER',
  status membership_status not null default 'INVITED',
  invited_email citext,
  invitation_token_hash text,
  invite_expires_at timestamptz,
  invited_by uuid references public.organization_members(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Active/bound members have a user and joined_at; invites have an email + token hash.
  constraint member_bound_shape check (
    (status in ('ACTIVE','SUSPENDED','REMOVED') and user_id is not null)
    or (status = 'INVITED' and invited_email is not null and invitation_token_hash is not null)
  )
);
-- One bound membership per (org, user).
create unique index organization_members_org_user_uidx
  on public.organization_members(organization_id, user_id)
  where user_id is not null;
-- One pending invite per (org, email).
create unique index organization_members_pending_invite_uidx
  on public.organization_members(organization_id, invited_email)
  where status = 'INVITED';
-- Exactly one active OWNER per organization.
create unique index organization_members_single_owner_uidx
  on public.organization_members(organization_id)
  where role = 'OWNER' and status = 'ACTIVE';
create index organization_members_org_idx on public.organization_members(organization_id);
create index organization_members_user_idx on public.organization_members(user_id);
create trigger organization_members_updated_at before update on public.organization_members
  for each row execute function public.set_updated_at();

-- ── departments ────────────────────────────────────────────────────
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  description text,
  manager_member_id uuid references public.organization_members(id) on delete set null,
  archived_at timestamptz,
  created_by_member_id uuid not null references public.organization_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Case-insensitive unique active department name per org.
create unique index departments_org_name_active_uidx
  on public.departments(organization_id, lower(name))
  where archived_at is null;
create index departments_org_idx on public.departments(organization_id);
create index departments_manager_idx on public.departments(manager_member_id);
create trigger departments_updated_at before update on public.departments
  for each row execute function public.set_updated_at();

-- ── subscriptions ──────────────────────────────────────────────────
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  owner_member_id uuid references public.organization_members(id) on delete set null,
  vendor_name text not null check (length(btrim(vendor_name)) between 1 and 120),
  product_name text not null check (length(btrim(product_name)) between 1 and 120),
  description text,
  category text,
  website_url text,
  status subscription_status not null default 'ACTIVE',
  billing_cadence billing_cadence not null,
  billing_interval_months integer check (billing_interval_months is null or billing_interval_months between 1 and 60),
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  start_date date,
  next_renewal_date date,
  end_date date,
  auto_renews boolean not null default true,
  notice_period_days integer not null default 30 check (notice_period_days between 0 and 365),
  seats_purchased integer check (seats_purchased is null or seats_purchased >= 0),
  seats_used integer check (seats_used is null or seats_used >= 0),
  contract_reference text,
  notes text,
  last_reviewed_at timestamptz,
  last_verified_at timestamptz,
  created_by_member_id uuid not null references public.organization_members(id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_custom_interval check (
    billing_cadence <> 'CUSTOM' or billing_interval_months is not null
  ),
  constraint subscription_seats_consistent check (
    seats_purchased is null or seats_used is null or seats_used <= seats_purchased
  ),
  constraint subscription_date_order check (
    start_date is null or end_date is null or end_date >= start_date
  )
);
create index subscriptions_org_idx on public.subscriptions(organization_id);
create index subscriptions_org_status_idx on public.subscriptions(organization_id, status);
create index subscriptions_department_idx on public.subscriptions(department_id);
create index subscriptions_owner_idx on public.subscriptions(owner_member_id);
create index subscriptions_renewal_idx on public.subscriptions(organization_id, next_renewal_date)
  where status in ('ACTIVE','TRIAL');
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ── subscription_members (seat assignments) ────────────────────────
create table public.subscription_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  member_id uuid not null references public.organization_members(id) on delete cascade,
  assigned_by_member_id uuid not null references public.organization_members(id),
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index subscription_members_active_uidx
  on public.subscription_members(subscription_id, member_id)
  where unassigned_at is null;
create index subscription_members_org_idx on public.subscription_members(organization_id);
create index subscription_members_member_idx on public.subscription_members(member_id) where unassigned_at is null;
create trigger subscription_members_updated_at before update on public.subscription_members
  for each row execute function public.set_updated_at();

-- ── subscription_requests ──────────────────────────────────────────
create table public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_member_id uuid not null references public.organization_members(id),
  department_id uuid references public.departments(id) on delete set null,
  vendor_name text not null,
  product_name text not null,
  business_justification text not null check (length(btrim(business_justification)) >= 1),
  requested_seats integer check (requested_seats is null or requested_seats >= 0),
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  billing_cadence billing_cadence not null,
  billing_interval_months integer check (billing_interval_months is null or billing_interval_months between 1 and 60),
  needed_by date,
  status request_status not null default 'DRAFT',
  decided_by_member_id uuid references public.organization_members(id),
  decided_at timestamptz,
  decision_note text,
  created_subscription_id uuid references public.subscriptions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint request_decider_not_author check (
    decided_by_member_id is null or decided_by_member_id <> requested_by_member_id
  )
);
create index subscription_requests_org_idx on public.subscription_requests(organization_id);
create index subscription_requests_open_idx on public.subscription_requests(organization_id, status)
  where status = 'SUBMITTED';
create index subscription_requests_author_idx on public.subscription_requests(requested_by_member_id);
create trigger subscription_requests_updated_at before update on public.subscription_requests
  for each row execute function public.set_updated_at();

-- ── subscription_reviews ───────────────────────────────────────────
create table public.subscription_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  scheduled_for date not null,
  assigned_to_member_id uuid references public.organization_members(id) on delete set null,
  status review_status not null default 'SCHEDULED',
  decision review_decision,
  summary text,
  recommended_seats integer check (recommended_seats is null or recommended_seats >= 0),
  completed_by_member_id uuid references public.organization_members(id),
  completed_at timestamptz,
  created_by_member_id uuid not null references public.organization_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_completion_shape check (
    status <> 'COMPLETED' or (decision is not null and summary is not null and completed_at is not null)
  )
);
create index subscription_reviews_org_idx on public.subscription_reviews(organization_id);
create index subscription_reviews_subscription_idx on public.subscription_reviews(subscription_id);
create index subscription_reviews_schedule_idx on public.subscription_reviews(organization_id, scheduled_for)
  where status in ('SCHEDULED','IN_PROGRESS');
create trigger subscription_reviews_updated_at before update on public.subscription_reviews
  for each row execute function public.set_updated_at();

-- ── offboarding_cases ──────────────────────────────────────────────
create table public.offboarding_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.organization_members(id) on delete cascade,
  departure_date date not null,
  status offboarding_status not null default 'OPEN',
  notes text,
  initiated_by_member_id uuid not null references public.organization_members(id),
  completed_by_member_id uuid references public.organization_members(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- At most one active offboarding case per member.
create unique index offboarding_cases_active_member_uidx
  on public.offboarding_cases(member_id)
  where status in ('OPEN','IN_PROGRESS');
create index offboarding_cases_org_idx on public.offboarding_cases(organization_id);
create trigger offboarding_cases_updated_at before update on public.offboarding_cases
  for each row execute function public.set_updated_at();

-- ── offboarding_tasks ──────────────────────────────────────────────
create table public.offboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  offboarding_case_id uuid not null references public.offboarding_cases(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  title text not null,
  description text,
  assigned_to_member_id uuid references public.organization_members(id) on delete set null,
  due_date date,
  status offboarding_task_status not null default 'PENDING',
  completed_by_member_id uuid references public.organization_members(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index offboarding_tasks_org_idx on public.offboarding_tasks(organization_id);
create index offboarding_tasks_case_idx on public.offboarding_tasks(offboarding_case_id);
create index offboarding_tasks_open_idx on public.offboarding_tasks(organization_id, status) where status = 'PENDING';
create trigger offboarding_tasks_updated_at before update on public.offboarding_tasks
  for each row execute function public.set_updated_at();

-- ── janitor_findings ───────────────────────────────────────────────
create table public.janitor_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  rule_key text not null,
  fingerprint text not null,
  severity janitor_severity not null,
  title text not null,
  description text not null,
  estimated_savings_minor bigint check (estimated_savings_minor is null or estimated_savings_minor >= 0),
  status janitor_finding_status not null default 'OPEN',
  evidence jsonb not null default '{}',
  detected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_member_id uuid references public.organization_members(id),
  dismissed_until timestamptz,
  dismissal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index janitor_findings_fingerprint_uidx on public.janitor_findings(organization_id, fingerprint);
create index janitor_findings_org_status_idx on public.janitor_findings(organization_id, status);
create trigger janitor_findings_updated_at before update on public.janitor_findings
  for each row execute function public.set_updated_at();

-- ── notifications ──────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_member_id uuid not null references public.organization_members(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null,
  href text,
  entity_type text,
  entity_id uuid,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index notifications_dedupe_uidx on public.notifications(organization_id, recipient_member_id, dedupe_key)
  where dedupe_key is not null;
create index notifications_recipient_unread_idx on public.notifications(recipient_member_id) where read_at is null;
create index notifications_org_idx on public.notifications(organization_id);

-- ── subscription_documents ─────────────────────────────────────────
create table public.subscription_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0 and size_bytes <= 26214400), -- 25 MiB cap
  document_kind text,
  uploaded_by_member_id uuid not null references public.organization_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscription_documents_org_idx on public.subscription_documents(organization_id);
create index subscription_documents_subscription_idx on public.subscription_documents(subscription_id);
create trigger subscription_documents_updated_at before update on public.subscription_documents
  for each row execute function public.set_updated_at();

-- ── audit_logs (append-only) ───────────────────────────────────────
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_member_id uuid references public.organization_members(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
