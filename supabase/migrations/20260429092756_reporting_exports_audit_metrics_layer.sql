begin;

alter table public.export_jobs
  add column if not exists camp_id uuid references public.camps(id),
  add column if not exists report_type text,
  add column if not exists export_format text default 'csv',
  add column if not exists status text default 'pending',
  add column if not exists date_from timestamptz,
  add column if not exists date_to timestamptz,
  add column if not exists storage_bucket text default 'exports',
  add column if not exists storage_path text,
  add column if not exists row_count integer,
  add column if not exists error_message text,
  add column if not exists requested_by uuid references public.profiles(id),
  add column if not exists completed_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_export_jobs_requested_created
  on public.export_jobs (requested_by, created_at desc)
  where archived_at is null;

create index if not exists idx_export_jobs_camp_status
  on public.export_jobs (camp_id, status, created_at desc)
  where archived_at is null;

create index if not exists idx_export_jobs_report_type_created
  on public.export_jobs (report_type, created_at desc)
  where archived_at is null;

insert into public.permissions (key, category, description)
values
  ('reports.view_dashboard', 'reports', 'View manager dashboard metrics.'),
  ('reports.view_occupancy', 'reports', 'View occupancy reports.'),
  ('reports.view_guests', 'reports', 'View guest reports.'),
  ('reports.view_rooms', 'reports', 'View room reports.'),
  ('reports.view_maintenance', 'reports', 'View maintenance reports.'),
  ('reports.view_housekeeping', 'reports', 'View housekeeping reports.'),
  ('reports.export_csv', 'reports', 'Export operational reports as CSV.'),
  ('reports.view_exports', 'reports', 'View export job history.')
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
  'executive_viewer'
)
and p.key in (
  'reports.view_dashboard',
  'reports.view_occupancy',
  'reports.view_guests',
  'reports.view_rooms',
  'reports.view_maintenance',
  'reports.view_housekeeping',
  'reports.view_exports'
)
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.key in (
  'super_admin',
  'system_admin',
  'camp_manager'
)
and p.key = 'reports.export_csv'
on conflict do nothing;

create or replace function public.create_export_job(
  p_report_type text,
  p_export_format text,
  p_camp_id uuid default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_job_id uuid;
  v_report_type text;
  v_export_format text;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('reports.export_csv');

  v_report_type := lower(btrim(coalesce(p_report_type, '')));
  v_export_format := lower(btrim(coalesce(p_export_format, 'csv')));

  if v_report_type not in (
    'occupancy',
    'guests',
    'rooms',
    'maintenance',
    'housekeeping',
    'room_service'
  ) then
    raise exception 'Invalid export report type.'
      using errcode = '22023';
  end if;

  if v_export_format not in ('csv') then
    raise exception 'Invalid export format.'
      using errcode = '22023';
  end if;

  if p_camp_id is not null then
    perform app_private.assert_camp_access(p_camp_id, 'operator');
  end if;

  if p_date_from is not null
     and p_date_to is not null
     and p_date_to <= p_date_from then
    raise exception 'Export date range is invalid.'
      using errcode = '22023';
  end if;

  insert into public.export_jobs (
    camp_id,
    report_type,
    export_format,
    status,
    date_from,
    date_to,
    requested_by
  )
  values (
    p_camp_id,
    v_report_type,
    v_export_format,
    'pending',
    p_date_from,
    p_date_to,
    auth.uid()
  )
  returning id into v_job_id;

  perform app_private.write_audit_log(
    'export_job.created',
    'export_job',
    v_job_id,
    p_camp_id,
    null,
    jsonb_build_object(
      'report_type', v_report_type,
      'export_format', v_export_format,
      'date_from', p_date_from,
      'date_to', p_date_to
    ),
    null
  );

  return v_job_id;
end;
$$;

create or replace function public.complete_export_job(
  p_export_job_id uuid,
  p_storage_bucket text,
  p_storage_path text,
  p_row_count integer
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_job public.export_jobs%rowtype;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('reports.export_csv');

  select *
  into v_job
  from public.export_jobs
  where id = p_export_job_id
  and archived_at is null
  for update;

  if not found then
    raise exception 'Export job not found.'
      using errcode = 'P0002';
  end if;

  if v_job.requested_by <> auth.uid() then
    perform app_private.assert_permission('reports.view_exports');
  end if;

  if p_storage_bucket <> 'exports' then
    raise exception 'Invalid export storage bucket.'
      using errcode = '22023';
  end if;

  if p_storage_path is null
     or btrim(p_storage_path) = ''
     or position('..' in p_storage_path) > 0 then
    raise exception 'Invalid export storage path.'
      using errcode = '22023';
  end if;

  update public.export_jobs
  set
    status = 'completed',
    storage_bucket = p_storage_bucket,
    storage_path = p_storage_path,
    row_count = greatest(coalesce(p_row_count, 0), 0),
    completed_at = now(),
    failed_at = null,
    error_message = null,
    updated_at = now()
  where id = p_export_job_id;

  perform app_private.write_audit_log(
    'export_job.completed',
    'export_job',
    p_export_job_id,
    v_job.camp_id,
    to_jsonb(v_job),
    jsonb_build_object(
      'storage_bucket', p_storage_bucket,
      'storage_path', p_storage_path,
      'row_count', p_row_count
    ),
    null
  );

  return p_export_job_id;
end;
$$;

create or replace function public.fail_export_job(
  p_export_job_id uuid,
  p_error_message text
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_job public.export_jobs%rowtype;
  v_error_message text;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('reports.export_csv');

  v_error_message := nullif(btrim(coalesce(p_error_message, '')), '');

  select *
  into v_job
  from public.export_jobs
  where id = p_export_job_id
  and archived_at is null
  for update;

  if not found then
    raise exception 'Export job not found.'
      using errcode = 'P0002';
  end if;

  update public.export_jobs
  set
    status = 'failed',
    failed_at = now(),
    error_message = coalesce(v_error_message, 'Export failed.'),
    updated_at = now()
  where id = p_export_job_id;

  perform app_private.write_audit_log(
    'export_job.failed',
    'export_job',
    p_export_job_id,
    v_job.camp_id,
    to_jsonb(v_job),
    jsonb_build_object('error_message', coalesce(v_error_message, 'Export failed.')),
    coalesce(v_error_message, 'Export failed.')
  );

  return p_export_job_id;
end;
$$;

revoke all on function public.create_export_job(text, text, uuid, timestamptz, timestamptz) from public;
revoke all on function public.complete_export_job(uuid, text, text, integer) from public;
revoke all on function public.fail_export_job(uuid, text) from public;

grant execute on function public.create_export_job(text, text, uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.complete_export_job(uuid, text, text, integer) to authenticated;
grant execute on function public.fail_export_job(uuid, text) to authenticated;

notify pgrst, 'reload schema';

commit;