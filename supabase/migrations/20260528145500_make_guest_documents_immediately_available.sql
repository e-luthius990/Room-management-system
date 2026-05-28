begin;

update public.guest_documents
set
  status = 'active',
  review_notes = null,
  reviewed_by = null,
  reviewed_at = null,
  updated_at = now()
where status = 'pending_review'
and archived_at is null
and deleted_at is null;

update public.guest_documents
set
  status = 'active',
  updated_at = now()
where status = 'approved'
and archived_at is null
and deleted_at is null;

alter table public.guest_documents
  alter column status set default 'active';

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

  perform app_private.assert_guest_access_in_camp(
    v_guest.id,
    v_guest.primary_camp_id
  );

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
    'active',
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
      'size_bytes', p_size_bytes,
      'status', 'active'
    ),
    v_notes
  );

  return v_document_id;
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

commit;
