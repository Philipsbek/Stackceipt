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
