-- Stackceipt — combined migration (0001 + 0002 + 0003 + 0004)
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to run once on a fresh project.


-- ============================================================
-- migrations/0001_init.sql
-- ============================================================

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


-- ============================================================
-- migrations/0002_functions.sql
-- ============================================================

-- Stackceipt — functions & triggers
-- Hardened helper functions for RLS (SECURITY DEFINER, locked search_path, fully
-- qualified objects) plus atomic workflow RPCs. Helpers are SECURITY DEFINER so RLS
-- policies can call them WITHOUT recursing into organization_members' own policies.

-- ── New auth user → profile ────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Membership helpers (used by RLS) ───────────────────────────────
create or replace function public.current_member_id(p_org uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id
  from public.organization_members m
  where m.organization_id = p_org
    and m.user_id = auth.uid()
    and m.status = 'ACTIVE'
  limit 1;
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
  );
$$;

create or replace function public.is_org_owner_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and m.role in ('OWNER','ADMIN')
  );
$$;

create or replace function public.is_org_owner(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and m.role = 'OWNER'
  );
$$;

-- Does the caller manage the given department (as its designated manager)?
create or replace function public.manages_department(p_department uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.departments d
    join public.organization_members m on m.id = d.manager_member_id
    where d.id = p_department
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and m.role = 'MANAGER'
  );
$$;

grant execute on function public.current_member_id(uuid) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_owner_admin(uuid) to authenticated;
grant execute on function public.is_org_owner(uuid) to authenticated;
grant execute on function public.manages_department(uuid) to authenticated;

-- ── Atomic: create organization + OWNER membership ─────────────────
create or replace function public.create_organization(
  p_name text,
  p_slug citext,
  p_base_currency char(3),
  p_timezone text,
  p_renewal_window_days integer default 90
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_member_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations (name, slug, base_currency, timezone, renewal_window_days, created_by)
  values (btrim(p_name), p_slug, upper(p_base_currency), p_timezone, coalesce(p_renewal_window_days, 90), v_uid)
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role, status, joined_at)
  values (v_org_id, v_uid, 'OWNER', 'ACTIVE', now())
  returning id into v_member_id;

  insert into public.audit_logs (organization_id, actor_member_id, action, entity_type, entity_id, after_data)
  values (v_org_id, v_member_id, 'organization.created', 'organization', v_org_id,
          jsonb_build_object('name', p_name, 'slug', p_slug));

  return v_org_id;
end;
$$;
grant execute on function public.create_organization(text, citext, char, text, integer) to authenticated;

-- ── Atomic: accept an invitation (email-bound, one-time) ───────────
create or replace function public.accept_invitation(p_raw_token text)
returns uuid
language plpgsql
security definer
-- `extensions` is on the search_path so pgcrypto's digest() resolves on Supabase.
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email citext;
  v_hash text;
  v_member public.organization_members%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select email::citext into v_email from auth.users where id = v_uid;
  v_hash := encode(digest(p_raw_token, 'sha256'), 'hex');

  select * into v_member
  from public.organization_members
  where invitation_token_hash = v_hash
    and status = 'INVITED'
  for update;

  if not found then
    raise exception 'Invitation not found or already used';
  end if;
  if v_member.invite_expires_at is not null and v_member.invite_expires_at < now() then
    raise exception 'Invitation has expired';
  end if;
  if lower(v_member.invited_email) <> lower(v_email) then
    raise exception 'This invitation is for a different email address';
  end if;

  update public.organization_members
  set user_id = v_uid,
      status = 'ACTIVE',
      joined_at = now(),
      invitation_token_hash = null,
      invited_email = null,
      invite_expires_at = null
  where id = v_member.id;

  insert into public.audit_logs (organization_id, actor_member_id, action, entity_type, entity_id)
  values (v_member.organization_id, v_member.id, 'member.invite_accepted', 'organization_member', v_member.id);

  return v_member.organization_id;
end;
$$;
grant execute on function public.accept_invitation(text) to authenticated;


-- ============================================================
-- migrations/0003_rls.sql
-- ============================================================

-- Stackceipt — Row Level Security
-- Every application table gets RLS enabled with default-deny, then explicit policies.
-- Writes that must be atomic or cross-user (org creation, invite acceptance, audit
-- inserts) go through SECURITY DEFINER functions and intentionally have NO direct
-- INSERT policy here.

-- Extra helper: is the caller owner/admin/manager (staff) of the org?
create or replace function public.is_org_staff(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and m.role in ('OWNER','ADMIN','MANAGER')
  );
$$;
grant execute on function public.is_org_staff(uuid) to authenticated;

-- Can the caller read a given subscription? Staff see all; members see owned/assigned.
create or replace function public.can_read_subscription(p_sub uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.id = p_sub
      and (
        public.is_org_staff(s.organization_id)
        or s.owner_member_id = public.current_member_id(s.organization_id)
        or exists (
          select 1 from public.subscription_members sm
          where sm.subscription_id = s.id
            and sm.member_id = public.current_member_id(s.organization_id)
            and sm.unassigned_at is null
        )
      )
  );
$$;
grant execute on function public.can_read_subscription(uuid) to authenticated;

-- ── Enable RLS everywhere ──────────────────────────────────────────
alter table public.profiles                enable row level security;
alter table public.organizations           enable row level security;
alter table public.organization_members    enable row level security;
alter table public.departments             enable row level security;
alter table public.subscriptions           enable row level security;
alter table public.subscription_members    enable row level security;
alter table public.subscription_requests   enable row level security;
alter table public.subscription_reviews    enable row level security;
alter table public.offboarding_cases       enable row level security;
alter table public.offboarding_tasks       enable row level security;
alter table public.janitor_findings        enable row level security;
alter table public.notifications           enable row level security;
alter table public.subscription_documents  enable row level security;
alter table public.audit_logs              enable row level security;

-- ── profiles ───────────────────────────────────────────────────────
-- Read your own profile, or a co-member's minimal profile. No global directory.
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());
create policy profiles_select_comembers on public.profiles
  for select using (
    exists (
      select 1
      from public.organization_members me
      join public.organization_members them on them.organization_id = me.organization_id
      where me.user_id = auth.uid() and me.status = 'ACTIVE'
        and them.user_id = public.profiles.id and them.status = 'ACTIVE'
    )
  );
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ── organizations ──────────────────────────────────────────────────
-- INSERT is via create_organization() RPC only (no direct insert policy).
create policy organizations_select on public.organizations
  for select using (public.is_org_member(id));
create policy organizations_update on public.organizations
  for update using (public.is_org_owner_admin(id)) with check (public.is_org_owner_admin(id));
create policy organizations_delete on public.organizations
  for delete using (public.is_org_owner(id));

-- ── organization_members ───────────────────────────────────────────
create policy members_select on public.organization_members
  for select using (public.is_org_member(organization_id));
create policy members_insert on public.organization_members
  for insert with check (public.is_org_owner_admin(organization_id));
create policy members_update on public.organization_members
  for update using (public.is_org_owner_admin(organization_id))
  with check (public.is_org_owner_admin(organization_id));
create policy members_delete on public.organization_members
  for delete using (public.is_org_owner_admin(organization_id));

-- ── departments ────────────────────────────────────────────────────
create policy departments_select on public.departments
  for select using (public.is_org_member(organization_id));
create policy departments_insert on public.departments
  for insert with check (public.is_org_owner_admin(organization_id));
create policy departments_update on public.departments
  for update using (public.is_org_owner_admin(organization_id) or public.manages_department(id))
  with check (public.is_org_owner_admin(organization_id) or public.manages_department(id));
create policy departments_delete on public.departments
  for delete using (public.is_org_owner_admin(organization_id));

-- ── subscriptions ──────────────────────────────────────────────────
create policy subscriptions_select on public.subscriptions
  for select using (
    public.is_org_staff(organization_id)
    or owner_member_id = public.current_member_id(organization_id)
    or exists (
      select 1 from public.subscription_members sm
      where sm.subscription_id = subscriptions.id
        and sm.member_id = public.current_member_id(organization_id)
        and sm.unassigned_at is null
    )
  );
create policy subscriptions_insert on public.subscriptions
  for insert with check (
    public.is_org_owner_admin(organization_id)
    or (department_id is not null and public.manages_department(department_id))
  );
create policy subscriptions_update on public.subscriptions
  for update using (
    public.is_org_owner_admin(organization_id)
    or (department_id is not null and public.manages_department(department_id))
  ) with check (
    public.is_org_owner_admin(organization_id)
    or (department_id is not null and public.manages_department(department_id))
  );
-- No hard delete for subscriptions with history — archive via status/archived_at.

-- ── subscription_members ───────────────────────────────────────────
create policy subscription_members_select on public.subscription_members
  for select using (
    public.can_read_subscription(subscription_id)
    or member_id = public.current_member_id(organization_id)
  );
create policy subscription_members_insert on public.subscription_members
  for insert with check (
    public.is_org_owner_admin(organization_id)
    or exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.department_id is not null
        and public.manages_department(s.department_id)
    )
  );
create policy subscription_members_update on public.subscription_members
  for update using (
    public.is_org_owner_admin(organization_id)
    or exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.department_id is not null
        and public.manages_department(s.department_id)
    )
  ) with check (public.is_org_member(organization_id));

-- ── subscription_requests ──────────────────────────────────────────
create policy requests_select on public.subscription_requests
  for select using (
    public.is_org_staff(organization_id)
    or requested_by_member_id = public.current_member_id(organization_id)
  );
create policy requests_insert on public.subscription_requests
  for insert with check (
    public.is_org_member(organization_id)
    and requested_by_member_id = public.current_member_id(organization_id)
  );
create policy requests_update on public.subscription_requests
  for update using (
    public.is_org_owner_admin(organization_id)
    or (department_id is not null and public.manages_department(department_id))
    or requested_by_member_id = public.current_member_id(organization_id)
  ) with check (public.is_org_member(organization_id));

-- ── subscription_reviews ───────────────────────────────────────────
create policy reviews_select on public.subscription_reviews
  for select using (public.is_org_staff(organization_id) or assigned_to_member_id = public.current_member_id(organization_id));
create policy reviews_insert on public.subscription_reviews
  for insert with check (public.is_org_staff(organization_id));
create policy reviews_update on public.subscription_reviews
  for update using (
    public.is_org_owner_admin(organization_id)
    or assigned_to_member_id = public.current_member_id(organization_id)
    or (exists (select 1 from public.subscriptions s where s.id = subscription_id and s.department_id is not null and public.manages_department(s.department_id)))
  ) with check (public.is_org_member(organization_id));

-- ── offboarding_cases ──────────────────────────────────────────────
create policy offboarding_cases_select on public.offboarding_cases
  for select using (public.is_org_staff(organization_id));
create policy offboarding_cases_insert on public.offboarding_cases
  for insert with check (public.is_org_staff(organization_id));
create policy offboarding_cases_update on public.offboarding_cases
  for update using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));

-- ── offboarding_tasks ──────────────────────────────────────────────
create policy offboarding_tasks_select on public.offboarding_tasks
  for select using (public.is_org_staff(organization_id) or assigned_to_member_id = public.current_member_id(organization_id));
create policy offboarding_tasks_insert on public.offboarding_tasks
  for insert with check (public.is_org_staff(organization_id));
create policy offboarding_tasks_update on public.offboarding_tasks
  for update using (
    public.is_org_staff(organization_id)
    or assigned_to_member_id = public.current_member_id(organization_id)
  ) with check (public.is_org_member(organization_id));

-- ── janitor_findings ───────────────────────────────────────────────
create policy janitor_select on public.janitor_findings
  for select using (public.is_org_staff(organization_id));
create policy janitor_insert on public.janitor_findings
  for insert with check (public.is_org_staff(organization_id));
create policy janitor_update on public.janitor_findings
  for update using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));

-- ── notifications ──────────────────────────────────────────────────
-- You can only see and mark read YOUR OWN notifications.
create policy notifications_select on public.notifications
  for select using (recipient_member_id = public.current_member_id(organization_id));
create policy notifications_update on public.notifications
  for update using (recipient_member_id = public.current_member_id(organization_id))
  with check (recipient_member_id = public.current_member_id(organization_id));

-- ── subscription_documents ─────────────────────────────────────────
create policy documents_select on public.subscription_documents
  for select using (public.can_read_subscription(subscription_id));
create policy documents_insert on public.subscription_documents
  for insert with check (
    public.is_org_owner_admin(organization_id)
    or exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.department_id is not null and public.manages_department(s.department_id)
    )
  );
create policy documents_delete on public.subscription_documents
  for delete using (
    public.is_org_owner_admin(organization_id)
    or exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.department_id is not null and public.manages_department(s.department_id)
    )
  );

-- ── audit_logs (read-only to owner/admin; inserts via SECURITY DEFINER only) ──
create policy audit_select on public.audit_logs
  for select using (public.is_org_owner_admin(organization_id));
-- No insert/update/delete policies → append-only for normal roles.


-- ============================================================
-- migrations/0004_storage.sql
-- ============================================================

-- Stackceipt — private document storage
-- A private bucket for subscription documents. Object paths are:
--   {organization_id}/{subscription_id}/{uuid}-{filename}
-- Access is granted only after verifying org membership AND subscription visibility.
-- The app must create short-lived signed URLs after a fresh authorization check;
-- the bucket is never public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'subscription-documents',
  'subscription-documents',
  false,
  26214400, -- 25 MiB
  array['application/pdf','image/png','image/jpeg','image/webp',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain','text/csv']
)
on conflict (id) do nothing;

-- Read: the object must be registered in subscription_documents and the caller must
-- be authorized to read the related subscription.
create policy documents_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'subscription-documents'
    and exists (
      select 1 from public.subscription_documents d
      where d.storage_path = storage.objects.name
        and public.can_read_subscription(d.subscription_id)
    )
  );

-- Write/delete: caller must be staff (owner/admin/manager) of the org that owns the
-- path prefix. Managers are further constrained to their subscriptions at the
-- subscription_documents table layer.
create policy documents_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'subscription-documents'
    and public.is_org_staff((split_part(name, '/', 1))::uuid)
  );

create policy documents_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'subscription-documents'
    and public.is_org_owner_admin((split_part(name, '/', 1))::uuid)
  );



-- ============================================================
-- migrations/0005_workflow.sql
-- ============================================================

-- Stackceipt — workflow support: hardened audit insertion + notification creation
-- Audit rows must never trust a client-supplied actor, so they are written ONLY through
-- this SECURITY DEFINER function, which derives the actor from the authenticated user.

create or replace function public.append_audit(
  p_org uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_before jsonb default null,
  p_after jsonb default null,
  p_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member uuid;
begin
  v_member := public.current_member_id(p_org);
  if v_member is null then
    raise exception 'Not an active member of organization';
  end if;
  insert into public.audit_logs
    (organization_id, actor_member_id, action, entity_type, entity_id, before_data, after_data, metadata)
  values
    (p_org, v_member, p_action, p_entity_type, p_entity_id, p_before, p_after, coalesce(p_metadata, '{}'));
end;
$$;
grant execute on function public.append_audit(uuid, text, text, uuid, jsonb, jsonb, jsonb) to authenticated;

-- Notifications: allow active members to create in-app notifications within their own
-- organization (used by server actions to notify approvers/requesters). Reading and
-- marking-read remain restricted to the recipient by the existing policies.
create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (public.is_org_member(organization_id));


-- ============================================================
-- migrations/0006_owner_admin_writes.sql
-- ============================================================

-- Stackceipt — tighten write access to Owner/Admin only.
-- Managers keep oversight READ access (they still appear in is_org_staff for SELECT
-- policies) but can no longer INSERT/UPDATE/decide. Members are unchanged.
-- Uses ALTER POLICY so no policy is dropped/recreated.

-- Departments: only owner/admin may edit.
alter policy departments_update on public.departments
  using (public.is_org_owner_admin(organization_id))
  with check (public.is_org_owner_admin(organization_id));

-- Subscriptions: create/update by owner/admin only.
alter policy subscriptions_insert on public.subscriptions
  with check (public.is_org_owner_admin(organization_id));
alter policy subscriptions_update on public.subscriptions
  using (public.is_org_owner_admin(organization_id))
  with check (public.is_org_owner_admin(organization_id));

-- Seat assignments: owner/admin only.
alter policy subscription_members_insert on public.subscription_members
  with check (public.is_org_owner_admin(organization_id));
alter policy subscription_members_update on public.subscription_members
  using (public.is_org_owner_admin(organization_id))
  with check (public.is_org_owner_admin(organization_id));

-- Requests: owner/admin decide any; the requester may still edit/cancel their own.
alter policy requests_update on public.subscription_requests
  using (
    public.is_org_owner_admin(organization_id)
    or requested_by_member_id = public.current_member_id(organization_id)
  )
  with check (public.is_org_member(organization_id));

-- Reviews: scheduled by owner/admin; completed by owner/admin or the assignee.
alter policy reviews_insert on public.subscription_reviews
  with check (public.is_org_owner_admin(organization_id));
alter policy reviews_update on public.subscription_reviews
  using (
    public.is_org_owner_admin(organization_id)
    or assigned_to_member_id = public.current_member_id(organization_id)
  )
  with check (public.is_org_member(organization_id));

-- Offboarding: cases managed by owner/admin; tasks completed by owner/admin or assignee.
alter policy offboarding_cases_insert on public.offboarding_cases
  with check (public.is_org_owner_admin(organization_id));
alter policy offboarding_cases_update on public.offboarding_cases
  using (public.is_org_owner_admin(organization_id))
  with check (public.is_org_owner_admin(organization_id));
alter policy offboarding_tasks_insert on public.offboarding_tasks
  with check (public.is_org_owner_admin(organization_id));
alter policy offboarding_tasks_update on public.offboarding_tasks
  using (
    public.is_org_owner_admin(organization_id)
    or assigned_to_member_id = public.current_member_id(organization_id)
  )
  with check (public.is_org_member(organization_id));

-- Janitor: resolve/dismiss by owner/admin only (managers still SELECT to view).
alter policy janitor_insert on public.janitor_findings
  with check (public.is_org_owner_admin(organization_id));
alter policy janitor_update on public.janitor_findings
  using (public.is_org_owner_admin(organization_id))
  with check (public.is_org_owner_admin(organization_id));

-- Documents: upload/delete by owner/admin only.
alter policy documents_insert on public.subscription_documents
  with check (public.is_org_owner_admin(organization_id));
alter policy documents_delete on public.subscription_documents
  using (public.is_org_owner_admin(organization_id));


-- ============================================================
-- migrations/0007_invitations.sql
-- ============================================================

-- Stackceipt — secure invitation creation and preview.

create or replace function public.create_invitation(
  p_org uuid,
  p_email citext,
  p_role organization_role,
  p_raw_token text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_actor uuid;
  v_invite_id uuid;
begin
  if not public.is_org_owner_admin(p_org) then
    raise exception 'Not authorized';
  end if;
  if p_role = 'OWNER' then
    raise exception 'Owner invitations are not allowed';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    raise exception 'Invalid invitation expiry';
  end if;
  if length(btrim(p_raw_token)) < 32 then
    raise exception 'Invitation token is too short';
  end if;

  v_actor := public.current_member_id(p_org);

  if exists (
    select 1
    from public.organization_members m
    join auth.users u on u.id = m.user_id
    where m.organization_id = p_org
      and m.status in ('ACTIVE', 'SUSPENDED')
      and lower(u.email) = lower(btrim(p_email::text))
  ) then
    raise exception 'This email is already a member';
  end if;

  insert into public.organization_members (
    organization_id, role, status, invited_email, invitation_token_hash,
    invite_expires_at, invited_by
  )
  values (
    p_org, p_role, 'INVITED', lower(btrim(p_email::text))::citext,
    encode(digest(p_raw_token, 'sha256'), 'hex'), p_expires_at, v_actor
  )
  on conflict (organization_id, invited_email) where status = 'INVITED'
  do update set
    role = excluded.role,
    invitation_token_hash = excluded.invitation_token_hash,
    invite_expires_at = excluded.invite_expires_at,
    invited_by = excluded.invited_by,
    updated_at = now()
  returning id into v_invite_id;

  perform public.append_audit(
    p_org, 'member.invited', 'organization_member', v_invite_id,
    null, jsonb_build_object('email', lower(btrim(p_email::text)), 'role', p_role),
    jsonb_build_object('expires_at', p_expires_at)
  );

  return v_invite_id;
end;
$$;

revoke all on function public.create_invitation(uuid, citext, organization_role, text, timestamptz) from public;
grant execute on function public.create_invitation(uuid, citext, organization_role, text, timestamptz) to authenticated;

create or replace function public.get_invitation_preview(p_raw_token text)
returns table (
  organization_name text,
  invited_email text,
  invited_role organization_role,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select o.name, m.invited_email::text, m.role, m.invite_expires_at
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.invitation_token_hash = encode(digest(p_raw_token, 'sha256'), 'hex')
    and m.status = 'INVITED'
    and (m.invite_expires_at is null or m.invite_expires_at > now())
  limit 1;
$$;

revoke all on function public.get_invitation_preview(text) from public;
grant execute on function public.get_invitation_preview(text) to anon, authenticated;
