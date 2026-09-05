-- Stackceipt — expose member emails to co-members.
--
-- Active members' emails live in auth.users (invited_email is cleared when an
-- invitation is accepted), so the app can't show them via a normal query. This
-- SECURITY DEFINER function returns each member's email for an organization,
-- guarded so only a member of that org may read its members' emails.

create or replace function public.org_member_emails(p_org uuid)
returns table (member_id uuid, email text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_org_member(p_org) then
    return;
  end if;
  return query
    select m.id, u.email::text
    from public.organization_members m
    join auth.users u on u.id = m.user_id
    where m.organization_id = p_org
      and m.user_id is not null;
end;
$$;

grant execute on function public.org_member_emails(uuid) to authenticated;
