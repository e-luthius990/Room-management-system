begin;

alter table public.guest_documents
  add column if not exists camp_id uuid references public.camps(id),
  add column if not exists storage_bucket text default 'guest-documents',
  add column if not exists storage_path text,
  add column if not exists original_filename text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists status text not null default 'pending_review',
  add column if not exists notes text,
  add column if not exists review_notes text,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.guest_documents gd
set camp_id = g.primary_camp_id
from public.guests g
where gd.guest_id = g.id
and gd.camp_id is null;

create index if not exists idx_guest_documents_guest_created
  on public.guest_documents (guest_id, created_at desc)
  where archived_at is null;

create index if not exists idx_guest_documents_camp_status
  on public.guest_documents (camp_id, status, created_at desc)
  where archived_at is null;

create index if not exists idx_guest_documents_storage_path
  on public.guest_documents (storage_bucket, storage_path)
  where archived_at is null;

insert into public.permissions (key, category, description)
values
  ('guest_documents.view', 'guest_documents', 'View guest document metadata and secure files.'),
  ('guest_documents.upload', 'guest_documents', 'Upload guest documents.'),
  ('guest_documents.review', 'guest_documents', 'Approve or reject guest documents.')
on conflict (key) do update
set
  category = excluded.category,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.key in (
  'super_admin',
  'system_admin',
  'camp_manager',
  'receptionist',
  'security_viewer'
)
and p.key in (
  'guest_documents.view',
  'guest_documents.upload'
)
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.key in (
  'super_admin',
  'system_admin',
  'camp_manager',
  'security_viewer'
)
and p.key = 'guest_documents.review'
on conflict do nothing;

create or replace function public.register_guest_document_upload(
  p_guest_id uuid,
  p_document_type text,
  p_storage_bucket text,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_guest public.guests%rowtype;
  v_document_id uuid;
  v_document_type text;
  v_notes text;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('guest_documents.upload');

  v_document_type := lower(btrim(coalesce(p_document_type, '')));
  v_notes := nullif(btrim(coalesce(p_notes, '')), '');

  if v_document_type not in (
    'passport',
    'national_id',
    'visa',
    'work_permit',
    'invitation_letter',
    'security_clearance',
    'other'
  ) then
    raise exception 'Invalid guest document type.'
      using errcode = '22023';
  end if;

  if p_storage_bucket <> 'guest-documents' then
    raise exception 'Invalid storage bucket.'
      using errcode = '22023';
  end if;

  if p_storage_path is null
     or btrim(p_storage_path) = ''
     or position('..' in p_storage_path) > 0
     or not starts_with(p_storage_path, p_guest_id::text || '/') then
    raise exception 'Invalid storage path.'
      using errcode = '22023';
  end if;

  if p_mime_type not in (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ) then
    raise exception 'Unsupported document file type.'
      using errcode = '22023';
  end if;

  if coalesce(p_size_bytes, 0) <= 0 or p_size_bytes > 10485760 then
    raise exception 'Document file size is invalid.'
      using errcode = '22023';
  end if;

  select *
  into v_guest
  from public.guests
  where id = p_guest_id
  and archived_at is null;

  if not found then
    raise exception 'Guest not found.'
      using errcode = 'P0002';
  end if;

  perform app_private.assert_guest_access_in_camp(v_guest.id, v_guest.primary_camp_id);

  insert into public.guest_documents (
    guest_id,
    camp_id,
    document_type,
    storage_bucket,
    storage_path,
    original_filename,
    mime_type,
    size_bytes,
    status,
    notes,
    created_by,
    updated_by
  )
  values (
    v_guest.id,
    v_guest.primary_camp_id,
    v_document_type,
    p_storage_bucket,
    p_storage_path,
    nullif(btrim(coalesce(p_original_filename, '')), ''),
    p_mime_type,
    p_size_bytes,
    'pending_review',
    v_notes,
    auth.uid(),
    auth.uid()
  )
  returning id into v_document_id;

  perform app_private.write_audit_log(
    'guest_document.uploaded',
    'guest_document',
    v_document_id,
    v_guest.primary_camp_id,
    null,
    jsonb_build_object(
      'guest_id', v_guest.id,
      'document_type', v_document_type,
      'storage_bucket', p_storage_bucket,
      'storage_path', p_storage_path,
      'mime_type', p_mime_type,
      'size_bytes', p_size_bytes
    ),
    v_notes
  );

  return v_document_id;
end;
$$;

create or replace function public.review_guest_document(
  p_document_id uuid,
  p_status text,
  p_review_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_document public.guest_documents%rowtype;
  v_old_value jsonb;
  v_new_status text;
  v_review_notes text;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('guest_documents.review');

  v_new_status := lower(btrim(coalesce(p_status, '')));
  v_review_notes := nullif(btrim(coalesce(p_review_notes, '')), '');

  if v_new_status not in ('approved', 'rejected') then
    raise exception 'Invalid document review status.'
      using errcode = '22023';
  end if;

  if v_new_status = 'rejected' and v_review_notes is null then
    raise exception 'Review notes are required when rejecting a document.'
      using errcode = '22023';
  end if;

  select *
  into v_document
  from public.guest_documents
  where id = p_document_id
  and archived_at is null
  for update;

  if not found then
    raise exception 'Guest document not found.'
      using errcode = 'P0002';
  end if;

  perform app_private.assert_guest_access_in_camp(v_document.guest_id, v_document.camp_id);

  v_old_value := to_jsonb(v_document);

  update public.guest_documents
  set
    status = v_new_status,
    review_notes = v_review_notes,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_document_id
  returning *
  into v_document;

  perform app_private.write_audit_log(
    'guest_document.reviewed',
    'guest_document',
    v_document.id,
    v_document.camp_id,
    v_old_value,
    to_jsonb(v_document),
    v_review_notes
  );

  return v_document.id;
end;
$$;

revoke all on function public.register_guest_document_upload(
  uuid,
  text,
  text,
  text,
  text,
  text,
  bigint,
  text
) from public;

revoke all on function public.review_guest_document(uuid, text, text) from public;

grant execute on function public.register_guest_document_upload(
  uuid,
  text,
  text,
  text,
  text,
  text,
  bigint,
  text
) to authenticated;

grant execute on function public.review_guest_document(uuid, text, text) to authenticated;

commit;