begin;

alter table public.security_clearance_events
  add column if not exists guest_id uuid references public.guests(id),
  add column if not exists camp_id uuid references public.camps(id),
  add column if not exists previous_status text,
  add column if not exists new_status text,
  add column if not exists risk_level text default 'normal',
  add column if not exists event_type text default 'clearance_update',
  add column if not exists notes text,
  add column if not exists expires_at timestamptz,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz default now();

create index if not exists idx_security_clearance_events_guest_created
  on public.security_clearance_events (guest_id, created_at desc);

create index if not exists idx_security_clearance_events_camp_created
  on public.security_clearance_events (camp_id, created_at desc);

create index if not exists idx_security_clearance_events_status
  on public.security_clearance_events (new_status, risk_level, created_at desc);

insert into public.permissions (key, category, description)
values
  ('security.view_clearance', 'security', 'View guest security clearance records.'),
  ('security.update_clearance_status', 'security', 'Update guest security clearance status.'),
  ('security.view_gate_dashboard', 'security', 'View gate dashboard.')
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
  'security.view_clearance',
  'security.view_gate_dashboard'
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
and p.key = 'security.update_clearance_status'
on conflict do nothing;

create or replace function public.create_security_clearance_event(
  p_guest_id uuid,
  p_new_status text,
  p_risk_level text,
  p_notes text,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_guest public.guests%rowtype;
  v_event_id uuid;
  v_new_status text;
  v_risk_level text;
  v_notes text;
  v_old_value jsonb;
  v_new_value jsonb;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('security.update_clearance_status');

  v_new_status := lower(btrim(coalesce(p_new_status, '')));
  v_risk_level := lower(btrim(coalesce(p_risk_level, 'normal')));
  v_notes := nullif(btrim(coalesce(p_notes, '')), '');

  if v_new_status not in (
    'pending',
    'cleared',
    'watchlist',
    'denied',
    'suspended'
  ) then
    raise exception 'Invalid security clearance status.'
      using errcode = '22023';
  end if;

  if v_risk_level not in (
    'low',
    'normal',
    'elevated',
    'high',
    'critical'
  ) then
    raise exception 'Invalid security risk level.'
      using errcode = '22023';
  end if;

  if v_new_status in ('watchlist', 'denied', 'suspended')
     and v_notes is null then
    raise exception 'Security notes are required for restricted clearance statuses.'
      using errcode = '22023';
  end if;

  select *
  into v_guest
  from public.guests
  where id = p_guest_id
  and archived_at is null
  for update;

  if not found then
    raise exception 'Guest not found.'
      using errcode = 'P0002';
  end if;

  perform app_private.assert_guest_access_in_camp(v_guest.id, v_guest.primary_camp_id);

  v_old_value := jsonb_build_object(
    'guest_id', v_guest.id,
    'security_clearance_status', v_guest.security_clearance_status
  );

  insert into public.security_clearance_events (
    guest_id,
    camp_id,
    previous_status,
    new_status,
    risk_level,
    event_type,
    notes,
    expires_at,
    created_by
  )
  values (
    v_guest.id,
    v_guest.primary_camp_id,
    v_guest.security_clearance_status,
    v_new_status,
    v_risk_level,
    'clearance_update',
    v_notes,
    p_expires_at,
    auth.uid()
  )
  returning id into v_event_id;

  update public.guests
  set
    security_clearance_status = v_new_status,
    updated_by = auth.uid(),
    updated_at = now()
  where id = v_guest.id
  returning *
  into v_guest;

  v_new_value := jsonb_build_object(
    'guest_id', v_guest.id,
    'security_clearance_status', v_guest.security_clearance_status,
    'risk_level', v_risk_level,
    'event_id', v_event_id
  );

  perform app_private.write_audit_log(
    'security_clearance.updated',
    'guest',
    v_guest.id,
    v_guest.primary_camp_id,
    v_old_value,
    v_new_value,
    v_notes
  );

  return v_event_id;
end;
$$;

revoke all on function public.create_security_clearance_event(
  uuid,
  text,
  text,
  text,
  timestamptz
) from public;

grant execute on function public.create_security_clearance_event(
  uuid,
  text,
  text,
  text,
  timestamptz
) to authenticated;

commit;