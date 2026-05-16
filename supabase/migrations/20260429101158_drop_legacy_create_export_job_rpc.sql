begin;

    drop function if exists public.create_export_job
    (
  uuid,
  text,
  text,
  jsonb
);

notify pgrst, 'reload schema';

commit;