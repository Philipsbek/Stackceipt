-- Stackceipt — department membership.
--
-- A many-to-many link between organization members and departments, so a member
-- can belong to one or more departments. Owners/admins manage membership; any
-- org member can see who's in a department.

create table if not exists public.department_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  member_id uuid not null references public.organization_members(id) on delete cascade,
  added_by_member_id uuid references public.organization_members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (department_id, member_id)
);

create index if not exists department_members_department_idx on public.department_members (department_id);
create index if not exists department_members_member_idx on public.department_members (member_id);
create index if not exists department_members_org_idx on public.department_members (organization_id);

alter table public.department_members enable row level security;

-- Any member of the org can see department rosters.
drop policy if exists department_members_select on public.department_members;
create policy department_members_select on public.department_members
  for select using (public.is_org_member(organization_id));

-- Only owners/admins add or remove department members.
drop policy if exists department_members_insert on public.department_members;
create policy department_members_insert on public.department_members
  for insert with check (public.is_org_owner_admin(organization_id));

drop policy if exists department_members_delete on public.department_members;
create policy department_members_delete on public.department_members
  for delete using (public.is_org_owner_admin(organization_id));
