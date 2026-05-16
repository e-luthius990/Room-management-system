begin;

alter table public.data_import_batches
  add column if not exists camp_id uuid references public.camps(id),
  add column if not exists import_type text,
  add column if not exists status text default 'pending',
  add column if not exists storage_bucket text default 'imports',
  add column if not exists storage_path text,
  add column if not exists original_filename text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists total_rows integer default 0,
  add column if not exists valid_rows integer default 0,
  add column if not exists invalid_rows integer default 0,
  add column if not exists error_message text,
  add column if not exists uploaded_by uuid references public.profiles(id),
  add column if not exists completed_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.data_import_rows
  add column if not exists batch_id uuid references public.data_import_batches(id),
  add column if not exists row_number integer,
  add column if not exists raw_payload jsonb default '{}'::jsonb,
  add column if not exists normalized_payload jsonb default '{}'::jsonb,
  add column if not exists validation_status text default 'pending',
  add column if not exists error_messages text[] default '{}'::text[],
  add column if not exists created_at timestamptz default now();

create index if not exists idx_data_import_batches_uploaded_created
  on public.data_import_batches (uploaded_by, created_at desc)
  where archived_at is null;

create index if not exists idx_data_import_batches_camp_status
  on public.data_import_batches (camp_id, status, created_at desc)
  where archived_at is null;

create index if not exists idx_data_import_rows_batch_row
  on public.data_import_rows (batch_id, row_number);

create index if not exists idx_data_import_rows_batch_status
  on public.data_import_rows (batch_id, validation_status);

insert into public.permissions (key, category, description)
values
  ('imports.view', 'imports', 'View data import batches and row results.'),
  ('imports.upload', 'imports', 'Upload and validate import files.'),
  ('imports.review', 'imports', 'Review import validation results.')
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
  'camp_manager'
)
and p.key in (
  'imports.view',
  'imports.upload',
  'imports.review'
)
on conflict do nothing;

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

create or replace function public.record_data_import_row_result(
  p_batch_id uuid,
  p_row_number integer,
  p_raw_payload jsonb,
  p_normalized_payload jsonb,
  p_validation_status text,
  p_error_messages text[] default '{}'::text[]
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_batch public.data_import_batches%rowtype;
  v_row_id uuid;
  v_status text;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('imports.upload');

  v_status := lower(btrim(coalesce(p_validation_status, '')));

  if v_status not in ('valid', 'invalid') then
    raise exception 'Invalid row validation status.'
      using errcode = '22023';
  end if;

  if coalesce(p_row_number, 0) <= 0 then
    raise exception 'Invalid row number.'
      using errcode = '22023';
  end if;

  select *
  into v_batch
  from public.data_import_batches
  where id = p_batch_id
  and archived_at is null
  for update;

  if not found then
    raise exception 'Import batch not found.'
      using errcode = 'P0002';
  end if;

  perform app_private.assert_camp_access(v_batch.camp_id, 'manager');

  if v_batch.status <> 'processing' then
    raise exception 'Import batch is not processing.'
      using errcode = 'P0001';
  end if;

  insert into public.data_import_rows (
    batch_id,
    row_number,
    raw_payload,
    normalized_payload,
    validation_status,
    error_messages
  )
  values (
    p_batch_id,
    p_row_number,
    coalesce(p_raw_payload, '{}'::jsonb),
    coalesce(p_normalized_payload, '{}'::jsonb),
    v_status,
    coalesce(p_error_messages, '{}'::text[])
  )
  returning id into v_row_id;

  return v_row_id;
end;
$$;

create or replace function public.complete_data_import_batch(
  p_batch_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_batch public.data_import_batches%rowtype;
  v_total integer;
  v_valid integer;
  v_invalid integer;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('imports.upload');

  select *
  into v_batch
  from public.data_import_batches
  where id = p_batch_id
  and archived_at is null
  for update;

  if not found then
    raise exception 'Import batch not found.'
      using errcode = 'P0002';
  end if;

  perform app_private.assert_camp_access(v_batch.camp_id, 'manager');

  select
    count(*)::integer,
    count(*) filter (where validation_status = 'valid')::integer,
    count(*) filter (where validation_status = 'invalid')::integer
  into v_total, v_valid, v_invalid
  from public.data_import_rows
  where batch_id = p_batch_id;

  update public.data_import_batches
  set
    status = case when v_invalid > 0 then 'completed_with_errors' else 'completed' end,
    total_rows = coalesce(v_total, 0),
    valid_rows = coalesce(v_valid, 0),
    invalid_rows = coalesce(v_invalid, 0),
    completed_at = now(),
    failed_at = null,
    error_message = null,
    updated_at = now()
  where id = p_batch_id;

  perform app_private.write_audit_log(
    'data_import_batch.completed',
    'data_import_batch',
    p_batch_id,
    v_batch.camp_id,
    to_jsonb(v_batch),
    jsonb_build_object(
      'total_rows', coalesce(v_total, 0),
      'valid_rows', coalesce(v_valid, 0),
      'invalid_rows', coalesce(v_invalid, 0)
    ),
    null
  );

  return p_batch_id;
end;
$$;

create or replace function public.fail_data_import_batch(
  p_batch_id uuid,
  p_error_message text
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_batch public.data_import_batches%rowtype;
  v_error text;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('imports.upload');

  v_error := nullif(btrim(coalesce(p_error_message, '')), '');

  select *
  into v_batch
  from public.data_import_batches
  where id = p_batch_id
  and archived_at is null
  for update;

  if not found then
    raise exception 'Import batch not found.'
      using errcode = 'P0002';
  end if;

  perform app_private.assert_camp_access(v_batch.camp_id, 'manager');

  update public.data_import_batches
  set
    status = 'failed',
    failed_at = now(),
    error_message = coalesce(v_error, 'Import failed.'),
    updated_at = now()
  where id = p_batch_id;

  perform app_private.write_audit_log(
    'data_import_batch.failed',
    'data_import_batch',
    p_batch_id,
    v_batch.camp_id,
    to_jsonb(v_batch),
    jsonb_build_object('error_message', coalesce(v_error, 'Import failed.')),
    coalesce(v_error, 'Import failed.')
  );

  return p_batch_id;
end;
$$;

revoke all on function public.create_data_import_batch(uuid, text, text, text, text, text, bigint) from public;
revoke all on function public.record_data_import_row_result(uuid, integer, jsonb, jsonb, text, text[]) from public;
revoke all on function public.complete_data_import_batch(uuid) from public;
revoke all on function public.fail_data_import_batch(uuid, text) from public;

grant execute on function public.create_data_import_batch(uuid, text, text, text, text, text, bigint) to authenticated;
grant execute on function public.record_data_import_row_result(uuid, integer, jsonb, jsonb, text, text[]) to authenticated;
grant execute on function public.complete_data_import_batch(uuid) to authenticated;
grant execute on function public.fail_data_import_batch(uuid, text) to authenticated;

notify pgrst, 'reload schema';

commit;