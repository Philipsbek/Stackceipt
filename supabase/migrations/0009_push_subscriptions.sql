-- Stackceipt — Web Push subscriptions for PWA notifications.
--
-- One row per browser/device a member has granted notification permission on.
-- The endpoint + keys are the Web Push standard subscription payload; the
-- server signs pushes with VAPID and delivers to these endpoints. Endpoints are
-- secret-ish (anyone holding them can push to the device), so RLS keeps each row
-- private to its owner. The server-side sender uses the service role (bypassing
-- RLS) to read every recipient's subscriptions when fanning out a notification.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.organization_members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  -- One subscription per endpoint per member (re-subscribing upserts).
  unique (member_id, endpoint)
);

create index if not exists push_subscriptions_member_idx
  on public.push_subscriptions (member_id);
create index if not exists push_subscriptions_org_idx
  on public.push_subscriptions (organization_id);

alter table public.push_subscriptions enable row level security;

-- Owners can see, register, and remove only their own device subscriptions.
-- (auth.uid() is the current user; user_id ties a subscription to that user.)
create policy push_subscriptions_select on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy push_subscriptions_insert on public.push_subscriptions
  for insert with check (
    user_id = auth.uid()
    and member_id = public.current_member_id(organization_id)
  );

create policy push_subscriptions_update on public.push_subscriptions
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy push_subscriptions_delete on public.push_subscriptions
  for delete using (user_id = auth.uid());
