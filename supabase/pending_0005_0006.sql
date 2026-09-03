-- Stackceipt — pending migrations 0005 + 0006
-- Paste into Supabase SQL Editor and Run. Safe to run once.

-- ===== 0005_workflow.sql =====

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

-- ===== 0006_owner_admin_writes.sql =====

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
