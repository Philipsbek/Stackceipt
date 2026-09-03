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
