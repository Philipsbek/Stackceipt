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
