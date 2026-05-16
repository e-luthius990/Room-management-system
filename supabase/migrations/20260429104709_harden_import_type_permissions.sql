begin;

create or replace function public.create_data_import_batch(
  p_camp_id uuid,
  p_import_type text,
  p_storage_bucket text,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_batch_id uuid;
  v_import_type text;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('imports.upload');

  v_import_type := lower(btrim(coalesce(p_import_type, '')));

  if v_import_type not in ('rooms_csv', 'guests_csv') then
    raise exception 'Invalid import type.'
      using errcode = '22023';
  end if;

  if v_import_type = 'rooms_csv' then
    perform app_private.assert_permission('imports.rooms');
  end if;

  if v_import_type = 'guests_csv' then
    perform app_private.assert_permission('imports.guests');
  end if;

  perform app_private.assert_camp_access(p_camp_id, 'manager');

  if p_storage_bucket <> 'imports' then
    raise exception 'Invalid import storage bucket.'
      using errcode = '22023';
  end if;

  if p_storage_path is null
     or btrim(p_storage_path) = ''
     or position('..' in p_storage_path) > 0 then
    raise exception 'Invalid import storage path.'
      using errcode = '22023';
  end if;

  if p_mime_type not in (
    'text/csv',
    'application/vnd.ms-excel'
  ) then
    raise exception 'Unsupported import file type.'
      using errcode = '22023';
  end if;

  if coalesce(p_size_bytes, 0) <= 0 or p_size_bytes > 20971520 then
    raise exception 'Import file size is invalid.'
      using errcode = '22023';
  end if;

  insert into public.data_import_batches (
    camp_id,
    import_type,
    status,
    storage_bucket,
    storage_path,
    original_filename,
    mime_type,
    size_bytes,
    uploaded_by
  )
  values (
    p_camp_id,
    v_import_type,
    'processing',
    p_storage_bucket,
    p_storage_path,
    nullif(btrim(coalesce(p_original_filename, '')), ''),
    p_mime_type,
    p_size_bytes,
    auth.uid()
  )
  returning id into v_batch_id;

  perform app_private.write_audit_log(
    'data_import_batch.created',
    'data_import_batch',
    v_batch_id,
    p_camp_id,
    null,
    jsonb_build_object(
      'import_type', v_import_type,
      'storage_bucket', p_storage_bucket,
      'storage_path', p_storage_path,
      'original_filename', p_original_filename,
      'size_bytes', p_size_bytes
    ),
    null
  );

  return v_batch_id;
end;
$$;

revoke all on function public.create_data_import_batch(
  uuid,
  text,
  text,
  text,
  text,
  text,
  bigint
) from public;

grant execute on function public.create_data_import_batch(
  uuid,
  text,
  text,
  text,
  text,
  text,
  bigint
) to authenticated;

notify pgrst, 'reload schema';

commit;