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
