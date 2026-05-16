begin;

    drop function if exists public.create_security_clearance_event
    (
  uuid,
  uuid,
  text,
  text
);

notify pgrst, 'reload schema';

commit;