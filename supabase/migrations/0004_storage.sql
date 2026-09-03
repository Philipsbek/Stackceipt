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
