begin;

revoke create on schema public from public;
revoke create on schema public from anon;
revoke create on schema public from authenticated;

grant usage on schema public to authenticated;

revoke all on schema app_private from public;
revoke all on schema app_private from anon;
revoke all on schema app_private from authenticated;

revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke all privileges on all functions in schema app_private from public;
revoke all privileges on all functions in schema app_private from anon;
revoke all privileges on all functions in schema app_private from authenticated;

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'alter table %I.%I enable row level security',
      r.schemaname,
      r.tablename
    );
  end loop;
end;
$$;

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
where id in (
  'guest-documents',
  'room-operations-files'
);

update storage.buckets
set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array[
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]::text[]
where id = 'imports';

update storage.buckets
set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array[
    'text/csv',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
where id = 'exports';

do $$
begin
  if to_regclass('public.audit_logs') is not null
     and to_regprocedure('app_private.prevent_audit_log_mutation()') is not null
     and not exists (
       select 1
       from pg_trigger
       where tgname = 'audit_logs_prevent_mutation_trigger'
       and tgrelid = 'public.audit_logs'::regclass
     ) then
    create trigger audit_logs_prevent_mutation_trigger
    before update or delete on public.audit_logs
    for each row
    execute function app_private.prevent_audit_log_mutation();
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;