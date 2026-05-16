begin;

-- ============================================================
-- 002 SECURE WORKFLOW RPC LAYER
-- Internal Room Operations Management System
-- Requires base schema migration to already exist.
-- ============================================================


-- ============================================================
-- PERMISSION PATCHES
-- ============================================================

insert into public.permissions (key, category, description)
values
  (
    'security.update_clearance_status',
    'security',
    'Create and update guest security clearance records.'
  )
on conflict (key) do update
set category = excluded.category,
    description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'security.update_clearance_status'
where r.key in ('super_admin', 'system_admin', 'camp_manager')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'keys.create'
where r.key in ('super_admin', 'system_admin', 'camp_manager')
on conflict do nothing;


-- ============================================================
-- AUDIT SCRUBBING
-- ============================================================

create or replace function app_private.scrub_audit_payload(
  p_entity_type text,
  p_payload jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, app_private
as $$
begin
  if p_payload is null then
    return null;
  end if;

  if p_entity_type in ('guests', 'guest_documents') then
    return p_payload
      - 'id_or_passport_number'
      - 'emergency_contact_name'
      - 'emergency_contact_phone'
      - 'manager_notes';
  end if;

  if p_entity_type = 'rooms' then
    return p_payload - 'sensitive_notes';
  end if;

  if p_entity_type = 'keys_access_cards' then
    return p_payload
      - 'key_code'
      - 'card_number';
  end if;

  if p_entity_type = 'profiles' then
    return p_payload
      - 'phone'
      - 'failed_login_count';
  end if;

  return p_payload;
end;
$$;

create or replace function app_private.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_camp_id uuid default null,
  p_old_value jsonb default null,
  p_new_value jsonb default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_id uuid;
begin
  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    camp_id,
    old_value,
    new_value,
    reason
  )
  values (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_camp_id,
    app_private.scrub_audit_payload(p_entity_type, p_old_value),
    app_private.scrub_audit_payload(p_entity_type, p_new_value),
    nullif(btrim(coalesce(p_reason, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;


-- ============================================================
-- ASSERTION HELPERS
-- ============================================================

create or replace function app_private.assert_active_user()
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not app_private.is_active_user() then
    raise exception 'Your account is not active.';
  end if;
end;
$$;

create or replace function app_private.assert_permission(
  required_permission text
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  perform app_private.assert_active_user();

  if not app_private.has_permission(required_permission) then
    raise exception 'You do not have permission to perform this action.';
  end if;
end;
$$;

create or replace function app_private.assert_camp_access(
  target_camp_id uuid,
  minimum_level camp_access_level default 'viewer'
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  perform app_private.assert_active_user();

  if target_camp_id is null then
    raise exception 'Camp is required.';
  end if;

  if not app_private.can_access_camp(target_camp_id, minimum_level) then
    raise exception 'You do not have access to this camp.';
  end if;
end;
$$;

create or replace function app_private.assert_guest_access_in_camp(
  target_guest_id uuid,
  target_camp_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  perform app_private.assert_active_user();

  if target_guest_id is null then
    raise exception 'Guest is required.';
  end if;

  if target_camp_id is null then
    raise exception 'Camp is required.';
  end if;

  if not app_private.can_access_guest(target_guest_id) then
    raise exception 'You do not have access to this guest.';
  end if;

  if not exists (
    select 1
    from public.guests g
    where g.id = target_guest_id
      and g.archived_at is null
      and (
        g.primary_camp_id = target_camp_id
        or exists (
          select 1
          from public.guest_camp_links gcl
          where gcl.guest_id = g.id
            and gcl.camp_id = target_camp_id
        )
      )
  ) then
    raise exception 'Guest does not belong to this camp.';
  end if;
end;
$$;

create or replace function app_private.assert_group_access_in_camp(
  target_group_id uuid,
  target_camp_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  perform app_private.assert_active_user();

  if target_group_id is null then
    raise exception 'Guest group is required.';
  end if;

  if target_camp_id is null then
    raise exception 'Camp is required.';
  end if;

  if not exists (
    select 1
    from public.guest_groups gg
    where gg.id = target_group_id
      and gg.camp_id = target_camp_id
      and gg.archived_at is null
      and app_private.can_access_camp(gg.camp_id, 'viewer')
  ) then
    raise exception 'Guest group does not belong to this camp.';
  end if;
end;
$$;


-- ============================================================
-- ROOM AVAILABILITY HELPERS
-- ============================================================

create or replace function app_private.assert_room_is_allocatable(
  target_room_id uuid
)
returns public.rooms
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_room public.rooms;
  v_has_blocking_maintenance boolean;
begin
  select *
  into v_room
  from public.rooms
  where id = target_room_id
  for update;

  if not found then
    raise exception 'Room not found.';
  end if;

  if v_room.deleted_at is not null then
    raise exception 'This room is no longer active.';
  end if;

  if v_room.current_status <> 'vacant_ready' then
    raise exception 'Room can only be allocated when it is Vacant Ready.';
  end if;

  select exists (
    select 1
    from public.maintenance_tickets mt
    where mt.room_id = target_room_id
      and mt.is_room_blocking = true
      and mt.status in (
        'reported',
        'assigned',
        'in_progress',
        'waiting_for_parts',
        'reopened'
      )
  )
  into v_has_blocking_maintenance;

  if v_has_blocking_maintenance then
    raise exception 'Room has an open blocking maintenance issue.';
  end if;

  return v_room;
end;
$$;

create or replace function app_private.assert_room_can_be_reserved_for_dates(
  target_room_id uuid,
  p_expected_arrival_at timestamptz,
  p_expected_departure_at timestamptz,
  p_ignore_reservation_id uuid default null
)
returns public.rooms
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_room public.rooms;
  v_has_blocking_maintenance boolean;
  v_has_overlapping_reservation boolean;
  v_has_overlapping_stay boolean;
begin
  if p_expected_arrival_at is null or p_expected_departure_at is null then
    raise exception 'Expected arrival and departure are required.';
  end if;

  if p_expected_departure_at <= p_expected_arrival_at then
    raise exception 'Expected departure must be after expected arrival.';
  end if;

  select *
  into v_room
  from public.rooms
  where id = target_room_id
  for update;

  if not found then
    raise exception 'Room not found.';
  end if;

  if v_room.deleted_at is not null then
    raise exception 'This room is no longer active.';
  end if;

  if v_room.current_status in ('out_of_service', 'manager_hold') then
    raise exception 'This room is not available for reservation.';
  end if;

  select exists (
    select 1
    from public.maintenance_tickets mt
    where mt.room_id = target_room_id
      and mt.is_room_blocking = true
      and mt.status in (
        'reported',
        'assigned',
        'in_progress',
        'waiting_for_parts',
        'reopened'
      )
  )
  into v_has_blocking_maintenance;

  if v_has_blocking_maintenance then
    raise exception 'Room has an open blocking maintenance issue.';
  end if;

  select exists (
    select 1
    from public.reservations r
    where r.room_id = target_room_id
      and r.status in ('pending', 'confirmed')
      and (p_ignore_reservation_id is null or r.id <> p_ignore_reservation_id)
      and tstzrange(r.expected_arrival_at, r.expected_departure_at, '[)')
          && tstzrange(p_expected_arrival_at, p_expected_departure_at, '[)')
  )
  into v_has_overlapping_reservation;

  if v_has_overlapping_reservation then
    raise exception 'Room already has an overlapping active reservation.';
  end if;

  select exists (
    select 1
    from public.stays s
    where s.room_id = target_room_id
      and s.status in ('reserved', 'checked_in', 'occupied')
      and tstzrange(
            coalesce(s.checked_in_at, s.expected_arrival_at),
            coalesce(
              s.checked_out_at,
              s.expected_departure_at,
              'infinity'::timestamptz
            ),
            '[)'
          )
          && tstzrange(p_expected_arrival_at, p_expected_departure_at, '[)')
  )
  into v_has_overlapping_stay;

  if v_has_overlapping_stay then
    raise exception 'Room already has an overlapping active stay.';
  end if;

  return v_room;
end;
$$;

create or replace function app_private.set_room_status_internal(
  p_room_id uuid,
  p_new_status room_status,
  p_reason text,
  p_related_entity_type text default null,
  p_related_entity_id uuid default null,
  p_actor_id uuid default null
)
returns public.rooms
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_room public.rooms;
  v_updated public.rooms;
begin
  select *
  into v_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception 'Room not found.';
  end if;

  if v_room.deleted_at is not null then
    raise exception 'This room is no longer active.';
  end if;

  if v_room.current_status = p_new_status then
    return v_room;
  end if;

  if not app_private.is_valid_room_status_transition(v_room.current_status, p_new_status) then
    raise exception 'Invalid room status transition from % to %.', v_room.current_status, p_new_status;
  end if;

  perform set_config('app.allow_room_status_update', 'on', true);
  perform set_config('app.room_status_reason', coalesce(p_reason, 'workflow_status_change'), true);
  perform set_config('app.room_status_entity_type', coalesce(p_related_entity_type, 'workflow'), true);
  perform set_config('app.room_status_entity_id', coalesce(p_related_entity_id::text, ''), true);

  update public.rooms
  set current_status = p_new_status,
      updated_by = coalesce(p_actor_id, auth.uid())
  where id = p_room_id
  returning * into v_updated;

  return v_updated;
end;
$$;

create or replace function app_private.release_room_after_reservation_change(
  p_room_id uuid,
  p_reason text,
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_room public.rooms;
  v_has_active_stay boolean;
  v_has_current_reservation boolean;
begin
  select *
  into v_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found then
    return;
  end if;

  if v_room.current_status <> 'reserved' then
    return;
  end if;

  select exists (
    select 1
    from public.stays s
    where s.room_id = p_room_id
      and s.status in ('reserved', 'checked_in', 'occupied')
  )
  into v_has_active_stay;

  if v_has_active_stay then
    return;
  end if;

  select exists (
    select 1
    from public.reservations r
    where r.room_id = p_room_id
      and r.status in ('pending', 'confirmed')
      and r.id <> p_reservation_id
      and r.expected_arrival_at <= now()
  )
  into v_has_current_reservation;

  if v_has_current_reservation then
    return;
  end if;

  perform app_private.set_room_status_internal(
    p_room_id,
    'vacant_ready',
    p_reason,
    'reservations',
    p_reservation_id,
    auth.uid()
  );
end;
$$;


-- ============================================================
-- CHECKLIST SEED HELPERS
-- ============================================================

create or replace function app_private.seed_housekeeping_task_items(
  p_task_id uuid
)
returns void
language sql
security definer
set search_path = public, app_private
as $$
  insert into public.housekeeping_task_items (
    task_id,
    item_key,
    label,
    is_required
  )
  values
    (p_task_id, 'bed_sheets_changed', 'Bed sheets changed', true),
    (p_task_id, 'bathroom_cleaned', 'Bathroom cleaned', true),
    (p_task_id, 'towels_replaced', 'Towels replaced', true),
    (p_task_id, 'dustbin_emptied', 'Dustbin emptied', true),
    (p_task_id, 'floor_cleaned', 'Floor cleaned', true),
    (p_task_id, 'ac_or_fan_checked', 'AC or fan checked', true),
    (p_task_id, 'lights_checked', 'Lights checked', true),
    (p_task_id, 'water_available', 'Water available', true),
    (p_task_id, 'toiletries_replaced', 'Toiletries replaced', true),
    (p_task_id, 'room_locked', 'Room locked', true)
  on conflict (task_id, item_key) do nothing;
$$;

create or replace function app_private.seed_inspection_items(
  p_inspection_id uuid
)
returns void
language sql
security definer
set search_path = public, app_private
as $$
  insert into public.inspection_items (
    inspection_id,
    item_key,
    label
  )
  values
    (p_inspection_id, 'room_clean', 'Room is clean'),
    (p_inspection_id, 'bathroom_clean', 'Bathroom is clean'),
    (p_inspection_id, 'bedding_ready', 'Bedding is ready'),
    (p_inspection_id, 'ac_or_fan_works', 'AC or fan works'),
    (p_inspection_id, 'lights_work', 'Lights work'),
    (p_inspection_id, 'water_works', 'Water works'),
    (p_inspection_id, 'door_lock_works', 'Door lock works'),
    (p_inspection_id, 'no_visible_damage', 'No visible damage'),
    (p_inspection_id, 'amenities_available', 'Amenities available'),
    (p_inspection_id, 'room_smells_fresh', 'Room smells fresh'),
    (p_inspection_id, 'room_ready_for_guest', 'Room is ready for guest')
  on conflict (inspection_id, item_key) do nothing;
$$;

create or replace function app_private.seed_vip_preparation_items(
  p_checklist_id uuid
)
returns void
language sql
security definer
set search_path = public, app_private
as $$
  insert into public.vip_preparation_items (
    checklist_id,
    item_key,
    label
  )
  values
    (p_checklist_id, 'room_cleaned_and_inspected', 'Room cleaned and inspected'),
    (p_checklist_id, 'ac_working', 'AC working'),
    (p_checklist_id, 'hot_water_working', 'Hot water working'),
    (p_checklist_id, 'internet_working', 'Internet working'),
    (p_checklist_id, 'fresh_towels', 'Fresh towels available'),
    (p_checklist_id, 'fresh_bedsheets', 'Fresh bedsheets available'),
    (p_checklist_id, 'drinking_water', 'Drinking water available'),
    (p_checklist_id, 'toiletries', 'Toiletries available'),
    (p_checklist_id, 'welcome_pack', 'Welcome pack prepared'),
    (p_checklist_id, 'security_check_complete', 'Security check complete'),
    (p_checklist_id, 'manager_approval', 'Manager approval complete')
  on conflict (checklist_id, item_key) do nothing;
$$;


-- ============================================================
-- ALLOCATION SAFETY TRIGGER
-- ============================================================

create or replace function app_private.validate_room_allocation()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_room public.rooms;
  v_blocking_maintenance_exists boolean;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select *
  into v_room
  from public.rooms
  where id = new.room_id
  for update;

  if not found then
    raise exception 'Room not found.';
  end if;

  if v_room.deleted_at is not null then
    raise exception 'Cannot allocate a deleted room.';
  end if;

  if v_room.current_status <> 'vacant_ready' then
    raise exception 'Room can only be allocated when it is Vacant Ready.';
  end if;

  select exists (
    select 1
    from public.maintenance_tickets mt
    where mt.room_id = new.room_id
      and mt.is_room_blocking = true
      and mt.status in (
        'reported',
        'assigned',
        'in_progress',
        'waiting_for_parts',
        'reopened'
      )
  )
  into v_blocking_maintenance_exists;

  if v_blocking_maintenance_exists then
    raise exception 'Room has an open blocking maintenance ticket.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_room_allocations_validate on public.room_allocations;

create trigger trg_room_allocations_validate
before insert on public.room_allocations
for each row
execute function app_private.validate_room_allocation();


-- ============================================================
-- RESERVATIONS
-- ============================================================

create or replace function public.create_reservation(
  p_guest_id uuid,
  p_group_id uuid,
  p_room_id uuid,
  p_expected_arrival_at timestamptz,
  p_expected_departure_at timestamptz,
  p_is_vip_hold boolean default false,
  p_notes text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_room public.rooms;
  v_reservation public.reservations;
begin
  perform app_private.assert_permission('reservations.create');

  v_room := app_private.assert_room_can_be_reserved_for_dates(
    p_room_id,
    p_expected_arrival_at,
    p_expected_departure_at,
    null
  );

  perform app_private.assert_camp_access(v_room.camp_id, 'operator');

  if p_guest_id is null and p_group_id is null then
    raise exception 'Reservation requires a guest or group.';
  end if;

  if p_guest_id is not null then
    perform app_private.assert_guest_access_in_camp(p_guest_id, v_room.camp_id);
  end if;

  if p_group_id is not null then
    perform app_private.assert_group_access_in_camp(p_group_id, v_room.camp_id);
  end if;

  insert into public.reservations (
    guest_id,
    group_id,
    camp_id,
    room_id,
    expected_arrival_at,
    expected_departure_at,
    status,
    is_vip_hold,
    notes,
    created_by,
    updated_by
  )
  values (
    p_guest_id,
    p_group_id,
    v_room.camp_id,
    p_room_id,
    p_expected_arrival_at,
    p_expected_departure_at,
    'confirmed',
    coalesce(p_is_vip_hold, false),
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid(),
    auth.uid()
  )
  returning * into v_reservation;

  if v_room.current_status = 'vacant_ready'
     and p_expected_arrival_at <= now() + interval '24 hours'
  then
    perform app_private.set_room_status_internal(
      p_room_id,
      'reserved',
      'reservation_created',
      'reservations',
      v_reservation.id,
      auth.uid()
    );
  end if;

  perform app_private.write_audit_log(
    'reservations.created',
    'reservations',
    v_reservation.id,
    v_reservation.camp_id,
    null,
    to_jsonb(v_reservation),
    p_notes
  );

  return v_reservation;
end;
$$;

create or replace function public.cancel_reservation(
  p_reservation_id uuid,
  p_reason text
)
returns public.reservations
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_reservation public.reservations;
  v_updated public.reservations;
begin
  perform app_private.assert_permission('reservations.cancel');

  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation not found.';
  end if;

  perform app_private.assert_camp_access(v_reservation.camp_id, 'operator');

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'Only pending or confirmed reservations can be cancelled.';
  end if;

  update public.reservations
  set status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_at = now(),
      cancellation_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      updated_by = auth.uid()
  where id = p_reservation_id
  returning * into v_updated;

  perform app_private.release_room_after_reservation_change(
    v_reservation.room_id,
    'reservation_cancelled',
    p_reservation_id
  );

  perform app_private.write_audit_log(
    'reservations.cancelled',
    'reservations',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_reservation),
    to_jsonb(v_updated),
    p_reason
  );

  return v_updated;
end;
$$;

create or replace function public.mark_reservation_no_show(
  p_reservation_id uuid,
  p_reason text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_reservation public.reservations;
  v_updated public.reservations;
begin
  perform app_private.assert_permission('reservations.mark_no_show');

  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation not found.';
  end if;

  perform app_private.assert_camp_access(v_reservation.camp_id, 'operator');

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'Only pending or confirmed reservations can be marked no-show.';
  end if;

  update public.reservations
  set status = 'no_show',
      updated_by = auth.uid()
  where id = p_reservation_id
  returning * into v_updated;

  perform app_private.release_room_after_reservation_change(
    v_reservation.room_id,
    'reservation_no_show',
    p_reservation_id
  );

  perform app_private.write_audit_log(
    'reservations.no_show',
    'reservations',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_reservation),
    to_jsonb(v_updated),
    p_reason
  );

  return v_updated;
end;
$$;


-- ============================================================
-- ALLOCATION / CHECK-IN / CHECK-OUT
-- ============================================================

create or replace function public.allocate_room(
  p_guest_id uuid,
  p_room_id uuid,
  p_expected_arrival_at timestamptz,
  p_expected_departure_at timestamptz,
  p_notes text default null
)
returns public.room_allocations
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_room public.rooms;
  v_stay public.stays;
  v_allocation public.room_allocations;
begin
  perform app_private.assert_permission('allocations.create');

  if p_expected_arrival_at is null or p_expected_departure_at is null then
    raise exception 'Expected arrival and departure are required.';
  end if;

  if p_expected_departure_at <= p_expected_arrival_at then
    raise exception 'Expected departure must be after expected arrival.';
  end if;

  v_room := app_private.assert_room_is_allocatable(p_room_id);

  perform app_private.assert_camp_access(v_room.camp_id, 'operator');
  perform app_private.assert_guest_access_in_camp(p_guest_id, v_room.camp_id);

  insert into public.stays (
    guest_id,
    room_id,
    camp_id,
    expected_arrival_at,
    expected_departure_at,
    status,
    created_by,
    updated_by
  )
  values (
    p_guest_id,
    p_room_id,
    v_room.camp_id,
    p_expected_arrival_at,
    p_expected_departure_at,
    'reserved',
    auth.uid(),
    auth.uid()
  )
  returning * into v_stay;

  insert into public.room_allocations (
    stay_id,
    guest_id,
    room_id,
    camp_id,
    status,
    allocation_notes,
    allocated_by
  )
  values (
    v_stay.id,
    p_guest_id,
    p_room_id,
    v_room.camp_id,
    'active',
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning * into v_allocation;

  perform app_private.write_audit_log(
    'allocations.created',
    'room_allocations',
    v_allocation.id,
    v_allocation.camp_id,
    null,
    jsonb_build_object(
      'allocation', to_jsonb(v_allocation),
      'stay', to_jsonb(v_stay)
    ),
    p_notes
  );

  return v_allocation;
end;
$$;

create or replace function public.check_in_stay(
  p_stay_id uuid,
  p_notes text default null,
  p_key_card_id uuid default null
)
returns public.stays
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_stay public.stays;
  v_updated public.stays;
  v_room public.rooms;
  v_key public.keys_access_cards;
begin
  perform app_private.assert_permission('stays.check_in');

  select *
  into v_stay
  from public.stays
  where id = p_stay_id
  for update;

  if not found then
    raise exception 'Stay not found.';
  end if;

  perform app_private.assert_camp_access(v_stay.camp_id, 'operator');

  if v_stay.status <> 'reserved' then
    raise exception 'Only reserved stays can be checked in.';
  end if;

  select *
  into v_room
  from public.rooms
  where id = v_stay.room_id
  for update;

  if v_room.current_status not in ('reserved', 'pending_check_in', 'vacant_ready') then
    raise exception 'Room is not ready for check-in.';
  end if;

  update public.stays
  set status = 'occupied',
      checked_in_at = now(),
      checkin_notes = nullif(btrim(coalesce(p_notes, '')), ''),
      updated_by = auth.uid()
  where id = p_stay_id
  returning * into v_updated;

  update public.room_allocations
  set status = 'checked_in'
  where stay_id = p_stay_id
    and status = 'active';

  if v_stay.reservation_id is not null then
    update public.reservations
    set status = 'checked_in',
        updated_by = auth.uid()
    where id = v_stay.reservation_id;
  end if;

  perform app_private.set_room_status_internal(
    v_stay.room_id,
    'occupied',
    'guest_checked_in',
    'stays',
    p_stay_id,
    auth.uid()
  );

  if p_key_card_id is not null then
    select *
    into v_key
    from public.keys_access_cards
    where id = p_key_card_id
    for update;

    if not found then
      raise exception 'Key or access card not found.';
    end if;

    if v_key.camp_id <> v_stay.camp_id then
      raise exception 'Key or access card does not belong to this camp.';
    end if;

    if v_key.status not in ('available', 'returned') then
      raise exception 'Key or access card is not available.';
    end if;

    update public.keys_access_cards
    set status = 'issued',
        issued_to_guest_id = v_stay.guest_id,
        issued_for_stay_id = v_stay.id,
        issued_by = auth.uid(),
        issued_at = now(),
        returned_by = null,
        returned_at = null
    where id = p_key_card_id;

    insert into public.key_access_card_events (
      key_card_id,
      camp_id,
      event_type,
      guest_id,
      stay_id,
      note,
      created_by
    )
    values (
      p_key_card_id,
      v_stay.camp_id,
      'issued',
      v_stay.guest_id,
      v_stay.id,
      'Issued during check-in.',
      auth.uid()
    );
  end if;

  perform app_private.write_audit_log(
    'stays.checked_in',
    'stays',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_stay),
    to_jsonb(v_updated),
    p_notes
  );

  return v_updated;
end;
$$;

create or replace function public.check_in_reservation(
  p_reservation_id uuid,
  p_notes text default null,
  p_key_card_id uuid default null
)
returns public.stays
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_reservation public.reservations;
  v_stay public.stays;
  v_checked_in public.stays;
  v_allocation public.room_allocations;
begin
  perform app_private.assert_permission('reservations.convert_to_checkin');

  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation not found.';
  end if;

  perform app_private.assert_camp_access(v_reservation.camp_id, 'operator');

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'Only pending or confirmed reservations can be checked in.';
  end if;

  if v_reservation.guest_id is null then
    raise exception 'Group reservations must be checked in through the group workflow.';
  end if;

  perform app_private.assert_guest_access_in_camp(
    v_reservation.guest_id,
    v_reservation.camp_id
  );

  insert into public.stays (
    guest_id,
    reservation_id,
    room_id,
    camp_id,
    expected_arrival_at,
    expected_departure_at,
    status,
    created_by,
    updated_by
  )
  values (
    v_reservation.guest_id,
    v_reservation.id,
    v_reservation.room_id,
    v_reservation.camp_id,
    v_reservation.expected_arrival_at,
    v_reservation.expected_departure_at,
    'reserved',
    auth.uid(),
    auth.uid()
  )
  returning * into v_stay;

  insert into public.room_allocations (
    stay_id,
    reservation_id,
    guest_id,
    room_id,
    camp_id,
    status,
    allocation_notes,
    allocated_by
  )
  values (
    v_stay.id,
    v_reservation.id,
    v_reservation.guest_id,
    v_reservation.room_id,
    v_reservation.camp_id,
    'checked_in',
    'Created from reservation check-in.',
    auth.uid()
  )
  returning * into v_allocation;

  v_checked_in := public.check_in_stay(v_stay.id, p_notes, p_key_card_id);

  perform app_private.write_audit_log(
    'reservations.converted_to_checkin',
    'reservations',
    v_reservation.id,
    v_reservation.camp_id,
    to_jsonb(v_reservation),
    jsonb_build_object(
      'stay', to_jsonb(v_checked_in),
      'allocation', to_jsonb(v_allocation)
    ),
    p_notes
  );

  return v_checked_in;
end;
$$;

create or replace function public.check_out_stay(
  p_stay_id uuid,
  p_notes text default null,
  p_key_cards_returned boolean default false,
  p_damage_or_loss_notes text default null
)
returns public.stays
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_stay public.stays;
  v_updated public.stays;
  v_task public.housekeeping_tasks;
begin
  perform app_private.assert_permission('stays.check_out');

  select *
  into v_stay
  from public.stays
  where id = p_stay_id
  for update;

  if not found then
    raise exception 'Stay not found.';
  end if;

  perform app_private.assert_camp_access(v_stay.camp_id, 'operator');

  if v_stay.status not in ('checked_in', 'occupied') then
    raise exception 'Only checked-in or occupied stays can be checked out.';
  end if;

  update public.stays
  set status = 'completed',
      checked_out_at = now(),
      checkout_notes = nullif(btrim(coalesce(p_notes, '')), ''),
      updated_by = auth.uid()
  where id = p_stay_id
  returning * into v_updated;

  update public.room_allocations
  set status = 'expired'
  where stay_id = p_stay_id
    and status in ('active', 'checked_in');

  if p_key_cards_returned then
    update public.keys_access_cards
    set status = 'returned',
        returned_by = auth.uid(),
        returned_at = now()
    where issued_for_stay_id = p_stay_id
      and status = 'issued';

    insert into public.key_access_card_events (
      key_card_id,
      camp_id,
      event_type,
      guest_id,
      stay_id,
      note,
      created_by
    )
    select
      kac.id,
      kac.camp_id,
      'returned',
      v_stay.guest_id,
      v_stay.id,
      'Returned during check-out.',
      auth.uid()
    from public.keys_access_cards kac
    where kac.issued_for_stay_id = p_stay_id
      and kac.status = 'returned';
  else
    insert into public.key_access_card_events (
      key_card_id,
      camp_id,
      event_type,
      guest_id,
      stay_id,
      note,
      created_by
    )
    select
      kac.id,
      kac.camp_id,
      'checkout_without_return',
      v_stay.guest_id,
      v_stay.id,
      coalesce(p_damage_or_loss_notes, 'Guest checked out without confirmed key/card return.'),
      auth.uid()
    from public.keys_access_cards kac
    where kac.issued_for_stay_id = p_stay_id
      and kac.status = 'issued';
  end if;

  perform app_private.set_room_status_internal(
    v_stay.room_id,
    'pending_checkout',
    'guest_checkout_started',
    'stays',
    p_stay_id,
    auth.uid()
  );

  perform app_private.set_room_status_internal(
    v_stay.room_id,
    'needs_cleaning',
    'guest_checked_out',
    'stays',
    p_stay_id,
    auth.uid()
  );

  insert into public.housekeeping_tasks (
    room_id,
    camp_id,
    stay_id,
    task_type,
    status,
    priority,
    notes,
    created_by,
    updated_by
  )
  values (
    v_stay.room_id,
    v_stay.camp_id,
    v_stay.id,
    'post_checkout_cleaning',
    'pending',
    'normal',
    nullif(btrim(coalesce(p_damage_or_loss_notes, '')), ''),
    auth.uid(),
    auth.uid()
  )
  returning * into v_task;

  perform app_private.seed_housekeeping_task_items(v_task.id);

  perform app_private.write_audit_log(
    'stays.checked_out',
    'stays',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_stay),
    jsonb_build_object(
      'stay', to_jsonb(v_updated),
      'housekeeping_task', to_jsonb(v_task),
      'key_cards_returned', p_key_cards_returned
    ),
    p_notes
  );

  return v_updated;
end;
$$;


-- ============================================================
-- ROOM TRANSFERS
-- ============================================================

create or replace function public.request_room_transfer(
  p_stay_id uuid,
  p_new_room_id uuid,
  p_reason text
)
returns public.room_transfers
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_stay public.stays;
  v_new_room public.rooms;
  v_transfer public.room_transfers;
begin
  perform app_private.assert_permission('transfers.request');

  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Transfer reason is required.';
  end if;

  select *
  into v_stay
  from public.stays
  where id = p_stay_id
  for update;

  if not found then
    raise exception 'Stay not found.';
  end if;

  perform app_private.assert_camp_access(v_stay.camp_id, 'operator');

  if v_stay.status not in ('checked_in', 'occupied') then
    raise exception 'Only occupied stays can be transferred.';
  end if;

  v_new_room := app_private.assert_room_is_allocatable(p_new_room_id);

  if v_new_room.camp_id <> v_stay.camp_id then
    raise exception 'Transfer room must be in the same camp.';
  end if;

  if v_stay.room_id = p_new_room_id then
    raise exception 'New room must be different from the current room.';
  end if;

  insert into public.room_transfers (
    stay_id,
    guest_id,
    camp_id,
    old_room_id,
    new_room_id,
    reason,
    status,
    requested_by
  )
  values (
    v_stay.id,
    v_stay.guest_id,
    v_stay.camp_id,
    v_stay.room_id,
    p_new_room_id,
    p_reason,
    'requested',
    auth.uid()
  )
  returning * into v_transfer;

  perform app_private.write_audit_log(
    'transfers.requested',
    'room_transfers',
    v_transfer.id,
    v_transfer.camp_id,
    null,
    to_jsonb(v_transfer),
    p_reason
  );

  return v_transfer;
end;
$$;

create or replace function public.approve_room_transfer(
  p_transfer_id uuid,
  p_note text default null
)
returns public.room_transfers
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_transfer public.room_transfers;
  v_updated public.room_transfers;
begin
  perform app_private.assert_permission('transfers.approve');

  select *
  into v_transfer
  from public.room_transfers
  where id = p_transfer_id
  for update;

  if not found then
    raise exception 'Transfer not found.';
  end if;

  perform app_private.assert_camp_access(v_transfer.camp_id, 'manager');

  if v_transfer.status <> 'requested' then
    raise exception 'Only requested transfers can be approved.';
  end if;

  update public.room_transfers
  set status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  where id = p_transfer_id
  returning * into v_updated;

  perform app_private.write_audit_log(
    'transfers.approved',
    'room_transfers',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_transfer),
    to_jsonb(v_updated),
    p_note
  );

  return v_updated;
end;
$$;

create or replace function public.execute_room_transfer(
  p_transfer_id uuid,
  p_note text default null
)
returns public.room_transfers
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_transfer public.room_transfers;
  v_updated public.room_transfers;
  v_stay public.stays;
  v_task public.housekeeping_tasks;
begin
  perform app_private.assert_permission('transfers.execute');

  select *
  into v_transfer
  from public.room_transfers
  where id = p_transfer_id
  for update;

  if not found then
    raise exception 'Transfer not found.';
  end if;

  perform app_private.assert_camp_access(v_transfer.camp_id, 'operator');

  if v_transfer.status = 'requested' then
    if not app_private.has_permission('transfers.approve') then
      raise exception 'This transfer must be approved before execution.';
    end if;

    update public.room_transfers
    set status = 'approved',
        approved_by = auth.uid(),
        approved_at = now()
    where id = p_transfer_id
    returning * into v_transfer;
  end if;

  if v_transfer.status <> 'approved' then
    raise exception 'Only approved transfers can be executed.';
  end if;

  select *
  into v_stay
  from public.stays
  where id = v_transfer.stay_id
  for update;

  if v_stay.status not in ('checked_in', 'occupied') then
    raise exception 'Only occupied stays can be transferred.';
  end if;

  perform app_private.assert_room_is_allocatable(v_transfer.new_room_id);

  update public.stays
  set room_id = v_transfer.new_room_id,
      updated_by = auth.uid()
  where id = v_transfer.stay_id;

  perform app_private.set_room_status_internal(
    v_transfer.old_room_id,
    'pending_checkout',
    'room_transfer_old_room_released',
    'room_transfers',
    p_transfer_id,
    auth.uid()
  );

  perform app_private.set_room_status_internal(
    v_transfer.old_room_id,
    'needs_cleaning',
    'room_transfer_old_room_needs_cleaning',
    'room_transfers',
    p_transfer_id,
    auth.uid()
  );

  perform app_private.set_room_status_internal(
    v_transfer.new_room_id,
    'occupied',
    'room_transfer_new_room_occupied',
    'room_transfers',
    p_transfer_id,
    auth.uid()
  );

  insert into public.housekeeping_tasks (
    room_id,
    camp_id,
    stay_id,
    task_type,
    status,
    priority,
    notes,
    created_by,
    updated_by
  )
  values (
    v_transfer.old_room_id,
    v_transfer.camp_id,
    v_transfer.stay_id,
    'post_transfer_cleaning',
    'pending',
    'normal',
    nullif(btrim(coalesce(p_note, '')), ''),
    auth.uid(),
    auth.uid()
  )
  returning * into v_task;

  perform app_private.seed_housekeeping_task_items(v_task.id);

  update public.room_transfers
  set status = 'executed',
      executed_by = auth.uid(),
      executed_at = now()
  where id = p_transfer_id
  returning * into v_updated;

  perform app_private.write_audit_log(
    'transfers.executed',
    'room_transfers',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_transfer),
    jsonb_build_object(
      'transfer', to_jsonb(v_updated),
      'housekeeping_task', to_jsonb(v_task)
    ),
    coalesce(p_note, v_transfer.reason)
  );

  return v_updated;
end;
$$;


-- ============================================================
-- HOUSEKEEPING
-- ============================================================

create or replace function public.create_housekeeping_task(
  p_room_id uuid,
  p_task_type text,
  p_priority task_priority default 'normal',
  p_assigned_to uuid default null,
  p_notes text default null
)
returns public.housekeeping_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_room public.rooms;
  v_task public.housekeeping_tasks;
  v_status housekeeping_task_status;
begin
  perform app_private.assert_permission('housekeeping.create_task');

  select *
  into v_room
  from public.rooms
  where id = p_room_id;

  if not found then
    raise exception 'Room not found.';
  end if;

  perform app_private.assert_camp_access(v_room.camp_id, 'supervisor');

  if p_assigned_to is null then
    v_status := 'pending';
  else
    v_status := 'assigned';
  end if;

  insert into public.housekeeping_tasks (
    room_id,
    camp_id,
    task_type,
    status,
    priority,
    assigned_to,
    assigned_by,
    notes,
    created_by,
    updated_by
  )
  values (
    p_room_id,
    v_room.camp_id,
    p_task_type,
    v_status,
    coalesce(p_priority, 'normal'),
    p_assigned_to,
    case when p_assigned_to is null then null else auth.uid() end,
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid(),
    auth.uid()
  )
  returning * into v_task;

  perform app_private.seed_housekeeping_task_items(v_task.id);

  perform app_private.write_audit_log(
    'housekeeping.task_created',
    'housekeeping_tasks',
    v_task.id,
    v_task.camp_id,
    null,
    to_jsonb(v_task),
    p_notes
  );

  return v_task;
end;
$$;

create or replace function public.assign_housekeeping_task(
  p_task_id uuid,
  p_assigned_to uuid,
  p_note text default null
)
returns public.housekeeping_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_task public.housekeeping_tasks;
  v_updated public.housekeeping_tasks;
begin
  perform app_private.assert_permission('housekeeping.assign_task');

  select *
  into v_task
  from public.housekeeping_tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Housekeeping task not found.';
  end if;

  perform app_private.assert_camp_access(v_task.camp_id, 'supervisor');

  if v_task.status not in ('pending', 'assigned') then
    raise exception 'Only pending or assigned tasks can be reassigned.';
  end if;

  update public.housekeeping_tasks
  set assigned_to = p_assigned_to,
      assigned_by = auth.uid(),
      status = 'assigned',
      updated_by = auth.uid()
  where id = p_task_id
  returning * into v_updated;

  perform app_private.write_audit_log(
    'housekeeping.task_assigned',
    'housekeeping_tasks',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_task),
    to_jsonb(v_updated),
    p_note
  );

  return v_updated;
end;
$$;

create or replace function public.start_housekeeping_task(
  p_task_id uuid
)
returns public.housekeeping_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_task public.housekeeping_tasks;
  v_updated public.housekeeping_tasks;
begin
  perform app_private.assert_permission('housekeeping.start_task');

  select *
  into v_task
  from public.housekeeping_tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Housekeeping task not found.';
  end if;

  perform app_private.assert_camp_access(v_task.camp_id, 'operator');

  if v_task.status not in ('pending', 'assigned') then
    raise exception 'Only pending or assigned housekeeping tasks can be started.';
  end if;

  update public.housekeeping_tasks
  set status = 'in_progress',
      started_at = coalesce(started_at, now()),
      updated_by = auth.uid()
  where id = p_task_id
  returning * into v_updated;

  perform app_private.write_audit_log(
    'housekeeping.task_started',
    'housekeeping_tasks',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_task),
    to_jsonb(v_updated),
    null
  );

  return v_updated;
end;
$$;

create or replace function public.complete_housekeeping_task(
  p_task_id uuid,
  p_completed_items jsonb,
  p_notes text default null
)
returns public.housekeeping_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_task public.housekeeping_tasks;
  v_updated public.housekeeping_tasks;
  v_missing_required_count integer;
  v_inspection public.inspections;
  v_requires_inspection boolean;
begin
  perform app_private.assert_permission('housekeeping.complete_task');

  if jsonb_typeof(coalesce(p_completed_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Completed checklist must be a JSON array.';
  end if;

  select *
  into v_task
  from public.housekeeping_tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Housekeeping task not found.';
  end if;

  perform app_private.assert_camp_access(v_task.camp_id, 'operator');

  if v_task.status <> 'in_progress' then
    raise exception 'Only in-progress housekeeping tasks can be completed.';
  end if;

  update public.housekeeping_task_items hti
  set is_completed = coalesce(x.is_completed, false),
      completed_by = case when coalesce(x.is_completed, false) then auth.uid() else null end,
      completed_at = case when coalesce(x.is_completed, false) then now() else null end,
      note = nullif(btrim(coalesce(x.note, '')), '')
  from jsonb_to_recordset(p_completed_items)
    as x(item_key text, is_completed boolean, note text)
  where hti.task_id = p_task_id
    and hti.item_key = x.item_key;

  select count(*)
  into v_missing_required_count
  from public.housekeeping_task_items
  where task_id = p_task_id
    and is_required = true
    and is_completed = false;

  if v_missing_required_count > 0 then
    raise exception 'All required housekeeping checklist items must be completed.';
  end if;

  update public.housekeeping_tasks
  set status = 'completed',
      completed_at = now(),
      notes = coalesce(nullif(btrim(coalesce(p_notes, '')), ''), notes),
      updated_by = auth.uid()
  where id = p_task_id
  returning * into v_updated;

  select coalesce(
    (
      select value = 'true'::jsonb
      from public.system_settings
      where key = 'room.cleaning_requires_inspection'
    ),
    true
  )
  into v_requires_inspection;

  if v_requires_inspection then
    insert into public.inspections (
      room_id,
      camp_id,
      related_housekeeping_task_id,
      inspection_type,
      status,
      created_by
    )
    values (
      v_task.room_id,
      v_task.camp_id,
      v_task.id,
      'post_cleaning',
      'pending',
      auth.uid()
    )
    returning * into v_inspection;

    perform app_private.seed_inspection_items(v_inspection.id);
  end if;

  perform app_private.write_audit_log(
    'housekeeping.task_completed',
    'housekeeping_tasks',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_task),
    jsonb_build_object(
      'task', to_jsonb(v_updated),
      'inspection', case when v_inspection.id is null then null else to_jsonb(v_inspection) end
    ),
    p_notes
  );

  return v_updated;
end;
$$;


-- ============================================================
-- MAINTENANCE
-- ============================================================

create or replace function public.create_maintenance_ticket(
  p_room_id uuid,
  p_issue_type text,
  p_priority maintenance_priority,
  p_description text,
  p_is_room_blocking boolean default true
)
returns public.maintenance_tickets
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_room public.rooms;
  v_ticket public.maintenance_tickets;
begin
  perform app_private.assert_permission('maintenance.create_ticket');

  select *
  into v_room
  from public.rooms
  where id = p_room_id;

  if not found then
    raise exception 'Room not found.';
  end if;

  perform app_private.assert_camp_access(v_room.camp_id, 'operator');

  insert into public.maintenance_tickets (
    room_id,
    camp_id,
    issue_type,
    priority,
    status,
    description,
    is_room_blocking,
    reported_by
  )
  values (
    p_room_id,
    v_room.camp_id,
    p_issue_type,
    coalesce(p_priority, 'medium'),
    'reported',
    p_description,
    coalesce(p_is_room_blocking, true),
    auth.uid()
  )
  returning * into v_ticket;

  insert into public.maintenance_ticket_updates (
    ticket_id,
    previous_status,
    new_status,
    note,
    created_by
  )
  values (
    v_ticket.id,
    null,
    'reported',
    p_description,
    auth.uid()
  );

  perform app_private.write_audit_log(
    'maintenance.ticket_created',
    'maintenance_tickets',
    v_ticket.id,
    v_ticket.camp_id,
    null,
    to_jsonb(v_ticket),
    p_description
  );

  return v_ticket;
end;
$$;

create or replace function public.assign_maintenance_ticket(
  p_ticket_id uuid,
  p_assigned_to uuid,
  p_note text default null
)
returns public.maintenance_tickets
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_ticket public.maintenance_tickets;
  v_updated public.maintenance_tickets;
begin
  perform app_private.assert_permission('maintenance.assign_ticket');

  select *
  into v_ticket
  from public.maintenance_tickets
  where id = p_ticket_id
  for update;

  if not found then
    raise exception 'Maintenance ticket not found.';
  end if;

  perform app_private.assert_camp_access(v_ticket.camp_id, 'supervisor');

  if v_ticket.status not in ('reported', 'assigned', 'reopened') then
    raise exception 'Only reported, assigned, or reopened tickets can be assigned.';
  end if;

  update public.maintenance_tickets
  set status = 'assigned',
      assigned_to = p_assigned_to,
      assigned_by = auth.uid()
  where id = p_ticket_id
  returning * into v_updated;

  insert into public.maintenance_ticket_updates (
    ticket_id,
    previous_status,
    new_status,
    note,
    created_by
  )
  values (
    p_ticket_id,
    v_ticket.status,
    'assigned',
    p_note,
    auth.uid()
  );

  perform app_private.write_audit_log(
    'maintenance.ticket_assigned',
    'maintenance_tickets',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_ticket),
    to_jsonb(v_updated),
    p_note
  );

  return v_updated;
end;
$$;

create or replace function public.start_maintenance_work(
  p_ticket_id uuid,
  p_note text default null
)
returns public.maintenance_tickets
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_ticket public.maintenance_tickets;
  v_updated public.maintenance_tickets;
begin
  perform app_private.assert_permission('maintenance.start_work');

  select *
  into v_ticket
  from public.maintenance_tickets
  where id = p_ticket_id
  for update;

  if not found then
    raise exception 'Maintenance ticket not found.';
  end if;

  perform app_private.assert_camp_access(v_ticket.camp_id, 'operator');

  if v_ticket.status not in ('assigned', 'reported', 'reopened') then
    raise exception 'Only assigned, reported, or reopened tickets can be started.';
  end if;

  update public.maintenance_tickets
  set status = 'in_progress',
      started_at = coalesce(started_at, now())
  where id = p_ticket_id
  returning * into v_updated;

  insert into public.maintenance_ticket_updates (
    ticket_id,
    previous_status,
    new_status,
    note,
    created_by
  )
  values (
    p_ticket_id,
    v_ticket.status,
    'in_progress',
    p_note,
    auth.uid()
  );

  perform app_private.write_audit_log(
    'maintenance.work_started',
    'maintenance_tickets',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_ticket),
    to_jsonb(v_updated),
    p_note
  );

  return v_updated;
end;
$$;

create or replace function public.mark_maintenance_resolved(
  p_ticket_id uuid,
  p_note text default null
)
returns public.maintenance_tickets
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_ticket public.maintenance_tickets;
  v_updated public.maintenance_tickets;
begin
  perform app_private.assert_permission('maintenance.mark_resolved');

  select *
  into v_ticket
  from public.maintenance_tickets
  where id = p_ticket_id
  for update;

  if not found then
    raise exception 'Maintenance ticket not found.';
  end if;

  perform app_private.assert_camp_access(v_ticket.camp_id, 'operator');

  if v_ticket.status not in ('assigned', 'in_progress', 'waiting_for_parts', 'reopened') then
    raise exception 'Only active maintenance tickets can be marked resolved.';
  end if;

  update public.maintenance_tickets
  set status = 'resolved',
      resolved_at = now()
  where id = p_ticket_id
  returning * into v_updated;

  insert into public.maintenance_ticket_updates (
    ticket_id,
    previous_status,
    new_status,
    note,
    created_by
  )
  values (
    p_ticket_id,
    v_ticket.status,
    'resolved',
    p_note,
    auth.uid()
  );

  perform app_private.write_audit_log(
    'maintenance.marked_resolved',
    'maintenance_tickets',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_ticket),
    to_jsonb(v_updated),
    p_note
  );

  return v_updated;
end;
$$;

create or replace function public.verify_maintenance_work(
  p_ticket_id uuid,
  p_note text default null
)
returns public.maintenance_tickets
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_ticket public.maintenance_tickets;
  v_updated public.maintenance_tickets;
  v_open_blocking_count integer;
  v_requires_inspection boolean;
  v_inspection public.inspections;
  v_room public.rooms;
begin
  perform app_private.assert_permission('maintenance.verify_work');

  select *
  into v_ticket
  from public.maintenance_tickets
  where id = p_ticket_id
  for update;

  if not found then
    raise exception 'Maintenance ticket not found.';
  end if;

  perform app_private.assert_camp_access(v_ticket.camp_id, 'supervisor');

  if v_ticket.status <> 'resolved' then
    raise exception 'Only resolved maintenance tickets can be verified.';
  end if;

  update public.maintenance_tickets
  set status = 'verified',
      verified_by = auth.uid(),
      verified_at = now()
  where id = p_ticket_id
  returning * into v_updated;

  insert into public.maintenance_ticket_updates (
    ticket_id,
    previous_status,
    new_status,
    note,
    created_by
  )
  values (
    p_ticket_id,
    v_ticket.status,
    'verified',
    p_note,
    auth.uid()
  );

  select count(*)
  into v_open_blocking_count
  from public.maintenance_tickets mt
  where mt.room_id = v_ticket.room_id
    and mt.id <> p_ticket_id
    and mt.is_room_blocking = true
    and mt.status in (
      'reported',
      'assigned',
      'in_progress',
      'waiting_for_parts',
      'reopened'
    );

  if v_open_blocking_count = 0 then
    select *
    into v_room
    from public.rooms
    where id = v_ticket.room_id
    for update;

    if v_room.current_status not in ('occupied', 'pending_checkout') then
      select coalesce(
        (
          select value = 'true'::jsonb
          from public.system_settings
          where key = 'room.maintenance_requires_inspection'
        ),
        true
      )
      into v_requires_inspection;

      if v_requires_inspection then
        perform app_private.set_room_status_internal(
          v_ticket.room_id,
          'inspection_needed',
          'maintenance_verified_inspection_required',
          'maintenance_tickets',
          p_ticket_id,
          auth.uid()
        );

        insert into public.inspections (
          room_id,
          camp_id,
          related_maintenance_ticket_id,
          inspection_type,
          status,
          created_by
        )
        values (
          v_ticket.room_id,
          v_ticket.camp_id,
          v_ticket.id,
          'post_maintenance',
          'pending',
          auth.uid()
        )
        returning * into v_inspection;

        perform app_private.seed_inspection_items(v_inspection.id);
      else
        perform app_private.set_room_status_internal(
          v_ticket.room_id,
          'vacant_ready',
          'maintenance_verified_room_ready',
          'maintenance_tickets',
          p_ticket_id,
          auth.uid()
        );
      end if;
    end if;
  end if;

  perform app_private.write_audit_log(
    'maintenance.verified',
    'maintenance_tickets',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_ticket),
    jsonb_build_object(
      'ticket', to_jsonb(v_updated),
      'inspection', case when v_inspection.id is null then null else to_jsonb(v_inspection) end
    ),
    p_note
  );

  return v_updated;
end;
$$;


-- ============================================================
-- INSPECTIONS
-- ============================================================

create or replace function public.complete_inspection(
  p_inspection_id uuid,
  p_passed boolean,
  p_items jsonb,
  p_note text default null
)
returns public.inspections
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_inspection public.inspections;
  v_updated public.inspections;
  v_failed_or_missing_count integer;
  v_required_permission text;
begin
  if p_passed then
    v_required_permission := 'inspections.approve_room_ready';
  else
    v_required_permission := 'inspections.reject_room_ready';
  end if;

  perform app_private.assert_permission(v_required_permission);

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Inspection items must be a JSON array.';
  end if;

  select *
  into v_inspection
  from public.inspections
  where id = p_inspection_id
  for update;

  if not found then
    raise exception 'Inspection not found.';
  end if;

  perform app_private.assert_camp_access(v_inspection.camp_id, 'supervisor');

  if v_inspection.status <> 'pending' then
    raise exception 'Only pending inspections can be completed.';
  end if;

  update public.inspection_items ii
  set passed = x.passed,
      note = nullif(btrim(coalesce(x.note, '')), '')
  from jsonb_to_recordset(p_items)
    as x(item_key text, passed boolean, note text)
  where ii.inspection_id = p_inspection_id
    and ii.item_key = x.item_key;

  if p_passed then
    select count(*)
    into v_failed_or_missing_count
    from public.inspection_items
    where inspection_id = p_inspection_id
      and passed is distinct from true;

    if v_failed_or_missing_count > 0 then
      raise exception 'All inspection items must pass before the room can be approved ready.';
    end if;
  end if;

  update public.inspections
  set status = case when p_passed then 'passed'::inspection_status else 'failed'::inspection_status end,
      inspected_by = auth.uid(),
      inspected_at = now(),
      failed_reason = case when p_passed then null else nullif(btrim(coalesce(p_note, '')), '') end
  where id = p_inspection_id
  returning * into v_updated;

  perform app_private.write_audit_log(
    case when p_passed then 'inspections.passed' else 'inspections.failed' end,
    'inspections',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_inspection),
    to_jsonb(v_updated),
    p_note
  );

  return v_updated;
end;
$$;


-- ============================================================
-- KEYS / ACCESS CARDS
-- ============================================================

create or replace function public.create_key_card(
  p_camp_id uuid,
  p_room_id uuid default null,
  p_key_code text default null,
  p_card_number text default null,
  p_notes text default null
)
returns public.keys_access_cards
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_room public.rooms;
  v_key public.keys_access_cards;
begin
  perform app_private.assert_permission('keys.create');
  perform app_private.assert_camp_access(p_camp_id, 'manager');

  if nullif(btrim(coalesce(p_key_code, '')), '') is null
     and nullif(btrim(coalesce(p_card_number, '')), '') is null then
    raise exception 'A key code or card number is required.';
  end if;

  if p_room_id is not null then
    select *
    into v_room
    from public.rooms
    where id = p_room_id
      and camp_id = p_camp_id
      and deleted_at is null;

    if not found then
      raise exception 'Room does not belong to this camp or is inactive.';
    end if;
  end if;

  insert into public.keys_access_cards (
    camp_id,
    room_id,
    key_code,
    card_number,
    status,
    notes
  )
  values (
    p_camp_id,
    p_room_id,
    nullif(btrim(coalesce(p_key_code, '')), ''),
    nullif(btrim(coalesce(p_card_number, '')), ''),
    'available',
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_key;

  insert into public.key_access_card_events (
    key_card_id,
    camp_id,
    event_type,
    note,
    created_by
  )
  values (
    v_key.id,
    v_key.camp_id,
    'created',
    p_notes,
    auth.uid()
  );

  perform app_private.write_audit_log(
    'keys.created',
    'keys_access_cards',
    v_key.id,
    v_key.camp_id,
    null,
    to_jsonb(v_key),
    p_notes
  );

  return v_key;
end;
$$;

create or replace function public.issue_key_card(
  p_key_card_id uuid,
  p_stay_id uuid,
  p_note text default null
)
returns public.keys_access_cards
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_key public.keys_access_cards;
  v_stay public.stays;
  v_updated public.keys_access_cards;
begin
  perform app_private.assert_permission('keys.issue');

  select *
  into v_key
  from public.keys_access_cards
  where id = p_key_card_id
  for update;

  if not found then
    raise exception 'Key or access card not found.';
  end if;

  select *
  into v_stay
  from public.stays
  where id = p_stay_id
  for update;

  if not found then
    raise exception 'Stay not found.';
  end if;

  perform app_private.assert_camp_access(v_key.camp_id, 'operator');

  if v_key.camp_id <> v_stay.camp_id then
    raise exception 'Key/card and stay must belong to the same camp.';
  end if;

  if v_key.status not in ('available', 'returned') then
    raise exception 'Key or access card is not available.';
  end if;

  update public.keys_access_cards
  set status = 'issued',
      issued_to_guest_id = v_stay.guest_id,
      issued_for_stay_id = v_stay.id,
      issued_by = auth.uid(),
      issued_at = now(),
      returned_by = null,
      returned_at = null
  where id = p_key_card_id
  returning * into v_updated;

  insert into public.key_access_card_events (
    key_card_id,
    camp_id,
    event_type,
    guest_id,
    stay_id,
    note,
    created_by
  )
  values (
    p_key_card_id,
    v_key.camp_id,
    'issued',
    v_stay.guest_id,
    v_stay.id,
    p_note,
    auth.uid()
  );

  perform app_private.write_audit_log(
    'keys.issued',
    'keys_access_cards',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_key),
    to_jsonb(v_updated),
    p_note
  );

  return v_updated;
end;
$$;

create or replace function public.return_key_card(
  p_key_card_id uuid,
  p_note text default null
)
returns public.keys_access_cards
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_key public.keys_access_cards;
  v_updated public.keys_access_cards;
begin
  perform app_private.assert_permission('keys.return');

  select *
  into v_key
  from public.keys_access_cards
  where id = p_key_card_id
  for update;

  if not found then
    raise exception 'Key or access card not found.';
  end if;

  perform app_private.assert_camp_access(v_key.camp_id, 'operator');

  if v_key.status <> 'issued' then
    raise exception 'Only issued keys/cards can be returned.';
  end if;

  update public.keys_access_cards
  set status = 'returned',
      returned_by = auth.uid(),
      returned_at = now()
  where id = p_key_card_id
  returning * into v_updated;

  insert into public.key_access_card_events (
    key_card_id,
    camp_id,
    event_type,
    guest_id,
    stay_id,
    note,
    created_by
  )
  values (
    p_key_card_id,
    v_key.camp_id,
    'returned',
    v_key.issued_to_guest_id,
    v_key.issued_for_stay_id,
    p_note,
    auth.uid()
  );

  perform app_private.write_audit_log(
    'keys.returned',
    'keys_access_cards',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_key),
    to_jsonb(v_updated),
    p_note
  );

  return v_updated;
end;
$$;

create or replace function public.mark_key_card_lost(
  p_key_card_id uuid,
  p_note text
)
returns public.keys_access_cards
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_key public.keys_access_cards;
  v_updated public.keys_access_cards;
begin
  perform app_private.assert_permission('keys.mark_lost');

  select *
  into v_key
  from public.keys_access_cards
  where id = p_key_card_id
  for update;

  if not found then
    raise exception 'Key or access card not found.';
  end if;

  perform app_private.assert_camp_access(v_key.camp_id, 'operator');

  update public.keys_access_cards
  set status = 'lost'
  where id = p_key_card_id
  returning * into v_updated;

  insert into public.key_access_card_events (
    key_card_id,
    camp_id,
    event_type,
    guest_id,
    stay_id,
    note,
    created_by
  )
  values (
    p_key_card_id,
    v_key.camp_id,
    'lost',
    v_key.issued_to_guest_id,
    v_key.issued_for_stay_id,
    p_note,
    auth.uid()
  );

  perform app_private.write_audit_log(
    'keys.lost',
    'keys_access_cards',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_key),
    to_jsonb(v_updated),
    p_note
  );

  return v_updated;
end;
$$;


-- ============================================================
-- ROOM SERVICE
-- ============================================================

create or replace function public.create_room_service_task(
  p_room_id uuid,
  p_task_type text,
  p_priority task_priority default 'normal',
  p_assigned_to uuid default null,
  p_due_at timestamptz default null,
  p_notes text default null
)
returns public.room_service_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_room public.rooms;
  v_current_stay public.stays;
  v_task public.room_service_tasks;
begin
  perform app_private.assert_permission('room_service.create_task');

  select *
  into v_room
  from public.rooms
  where id = p_room_id;

  if not found then
    raise exception 'Room not found.';
  end if;

  perform app_private.assert_camp_access(v_room.camp_id, 'operator');

  select *
  into v_current_stay
  from public.stays s
  where s.room_id = p_room_id
    and s.status in ('checked_in', 'occupied')
  order by s.checked_in_at desc
  limit 1;

  insert into public.room_service_tasks (
    room_id,
    camp_id,
    stay_id,
    task_type,
    status,
    priority,
    assigned_to,
    assigned_by,
    due_at,
    notes,
    created_by,
    updated_by
  )
  values (
    p_room_id,
    v_room.camp_id,
    case when v_current_stay.id is null then null else v_current_stay.id end,
    p_task_type,
    case when p_assigned_to is null then 'pending' else 'assigned' end,
    coalesce(p_priority, 'normal'),
    p_assigned_to,
    case when p_assigned_to is null then null else auth.uid() end,
    p_due_at,
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid(),
    auth.uid()
  )
  returning * into v_task;

  perform app_private.write_audit_log(
    'room_service.task_created',
    'room_service_tasks',
    v_task.id,
    v_task.camp_id,
    null,
    to_jsonb(v_task),
    p_notes
  );

  return v_task;
end;
$$;

create or replace function public.start_room_service_task(
  p_task_id uuid
)
returns public.room_service_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_task public.room_service_tasks;
  v_updated public.room_service_tasks;
begin
  perform app_private.assert_permission('room_service.start_task');

  select *
  into v_task
  from public.room_service_tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Room service task not found.';
  end if;

  perform app_private.assert_camp_access(v_task.camp_id, 'operator');

  if v_task.status not in ('pending', 'assigned') then
    raise exception 'Only pending or assigned room service tasks can be started.';
  end if;

  update public.room_service_tasks
  set status = 'in_progress',
      started_at = coalesce(started_at, now()),
      updated_by = auth.uid()
  where id = p_task_id
  returning * into v_updated;

  perform app_private.write_audit_log(
    'room_service.task_started',
    'room_service_tasks',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_task),
    to_jsonb(v_updated),
    null
  );

  return v_updated;
end;
$$;

create or replace function public.complete_room_service_task(
  p_task_id uuid,
  p_note text default null
)
returns public.room_service_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_task public.room_service_tasks;
  v_updated public.room_service_tasks;
begin
  perform app_private.assert_permission('room_service.complete_task');

  select *
  into v_task
  from public.room_service_tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Room service task not found.';
  end if;

  perform app_private.assert_camp_access(v_task.camp_id, 'operator');

  if v_task.status <> 'in_progress' then
    raise exception 'Only in-progress room service tasks can be completed.';
  end if;

  update public.room_service_tasks
  set status = 'completed',
      completed_at = now(),
      notes = coalesce(nullif(btrim(coalesce(p_note, '')), ''), notes),
      updated_by = auth.uid()
  where id = p_task_id
  returning * into v_updated;

  perform app_private.write_audit_log(
    'room_service.task_completed',
    'room_service_tasks',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_task),
    to_jsonb(v_updated),
    p_note
  );

  return v_updated;
end;
$$;


-- ============================================================
-- VIP / DELEGATE READINESS
-- ============================================================

create or replace function public.create_vip_preparation_checklist(
  p_guest_id uuid,
  p_group_id uuid,
  p_room_id uuid,
  p_notes text default null
)
returns public.vip_preparation_checklists
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_room public.rooms;
  v_checklist public.vip_preparation_checklists;
begin
  perform app_private.assert_permission('vip.create');

  if p_guest_id is null and p_group_id is null then
    raise exception 'VIP checklist requires a guest or group.';
  end if;

  select *
  into v_room
  from public.rooms
  where id = p_room_id;

  if not found then
    raise exception 'Room not found.';
  end if;

  perform app_private.assert_camp_access(v_room.camp_id, 'manager');

  if p_guest_id is not null then
    perform app_private.assert_guest_access_in_camp(p_guest_id, v_room.camp_id);
  end if;

  if p_group_id is not null then
    perform app_private.assert_group_access_in_camp(p_group_id, v_room.camp_id);
  end if;

  insert into public.vip_preparation_checklists (
    guest_id,
    group_id,
    room_id,
    camp_id,
    status,
    notes,
    created_by,
    updated_by
  )
  values (
    p_guest_id,
    p_group_id,
    p_room_id,
    v_room.camp_id,
    'pending',
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid(),
    auth.uid()
  )
  returning * into v_checklist;

  perform app_private.seed_vip_preparation_items(v_checklist.id);

  perform app_private.write_audit_log(
    'vip.checklist_created',
    'vip_preparation_checklists',
    v_checklist.id,
    v_checklist.camp_id,
    null,
    to_jsonb(v_checklist),
    p_notes
  );

  return v_checklist;
end;
$$;

create or replace function public.approve_vip_readiness(
  p_checklist_id uuid,
  p_note text default null
)
returns public.vip_preparation_checklists
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_checklist public.vip_preparation_checklists;
  v_updated public.vip_preparation_checklists;
  v_incomplete_count integer;
begin
  perform app_private.assert_permission('vip.approve_readiness');

  select *
  into v_checklist
  from public.vip_preparation_checklists
  where id = p_checklist_id
  for update;

  if not found then
    raise exception 'VIP preparation checklist not found.';
  end if;

  perform app_private.assert_camp_access(v_checklist.camp_id, 'manager');

  select count(*)
  into v_incomplete_count
  from public.vip_preparation_items
  where checklist_id = p_checklist_id
    and is_completed = false;

  if v_incomplete_count > 0 then
    raise exception 'All VIP preparation items must be completed before approval.';
  end if;

  update public.vip_preparation_checklists
  set status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      notes = coalesce(nullif(btrim(coalesce(p_note, '')), ''), notes),
      updated_by = auth.uid()
  where id = p_checklist_id
  returning * into v_updated;

  perform app_private.write_audit_log(
    'vip.readiness_approved',
    'vip_preparation_checklists',
    v_updated.id,
    v_updated.camp_id,
    to_jsonb(v_checklist),
    to_jsonb(v_updated),
    p_note
  );

  return v_updated;
end;
$$;


-- ============================================================
-- DOCUMENT ACCESS, EXPORTS, SECURITY CLEARANCE
-- ============================================================

create or replace function public.record_guest_document_access(
  p_document_id uuid,
  p_access_type text,
  p_reason text default null
)
returns public.guest_documents
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_document public.guest_documents;
  v_required_permission text;
begin
  if p_access_type not in ('view', 'download') then
    raise exception 'Document access type must be view or download.';
  end if;

  v_required_permission := case
    when p_access_type = 'download' then 'guest_documents.download'
    else 'guest_documents.view'
  end;

  perform app_private.assert_permission(v_required_permission);

  select *
  into v_document
  from public.guest_documents
  where id = p_document_id
    and status = 'active';

  if not found then
    raise exception 'Guest document not found.';
  end if;

  perform app_private.assert_camp_access(v_document.camp_id, 'operator');

  perform app_private.write_audit_log(
    case when p_access_type = 'download' then 'guest_documents.downloaded' else 'guest_documents.viewed' end,
    'guest_documents',
    v_document.id,
    v_document.camp_id,
    null,
    jsonb_build_object(
      'guest_id', v_document.guest_id,
      'document_type', v_document.document_type,
      'storage_bucket', v_document.storage_bucket,
      'storage_path', v_document.storage_path,
      'access_type', p_access_type
    ),
    p_reason
  );

  return v_document;
end;
$$;

create or replace function public.create_export_job(
  p_camp_id uuid,
  p_export_type text,
  p_format text,
  p_filter_payload jsonb default '{}'::jsonb
)
returns public.export_jobs
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_job public.export_jobs;
  v_permission text;
begin
  if p_format not in ('csv', 'xlsx', 'pdf') then
    raise exception 'Unsupported export format.';
  end if;

  v_permission := case
    when p_format = 'csv' then 'reports.export_csv'
    when p_format = 'xlsx' then 'reports.export_excel'
    when p_format = 'pdf' then 'reports.export_pdf'
    else 'reports.export_csv'
  end;

  perform app_private.assert_permission(v_permission);

  if p_camp_id is not null then
    perform app_private.assert_camp_access(p_camp_id, 'manager');
  end if;

  insert into public.export_jobs (
    camp_id,
    export_type,
    format,
    status,
    filter_payload,
    created_by
  )
  values (
    p_camp_id,
    p_export_type,
    p_format,
    'pending',
    coalesce(p_filter_payload, '{}'::jsonb),
    auth.uid()
  )
  returning * into v_job;

  perform app_private.write_audit_log(
    'reports.export_requested',
    'export_jobs',
    v_job.id,
    v_job.camp_id,
    null,
    to_jsonb(v_job),
    p_export_type
  );

  return v_job;
end;
$$;

create or replace function public.create_security_clearance_event(
  p_guest_id uuid,
  p_camp_id uuid,
  p_clearance_status text,
  p_note text default null
)
returns public.security_clearance_events
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_event public.security_clearance_events;
begin
  perform app_private.assert_permission('security.update_clearance_status');
  perform app_private.assert_camp_access(p_camp_id, 'operator');

  perform app_private.assert_guest_access_in_camp(p_guest_id, p_camp_id);

  insert into public.security_clearance_events (
    guest_id,
    camp_id,
    clearance_status,
    note,
    created_by
  )
  values (
    p_guest_id,
    p_camp_id,
    p_clearance_status,
    nullif(btrim(coalesce(p_note, '')), ''),
    auth.uid()
  )
  returning * into v_event;

  update public.guests
  set security_clearance_status = p_clearance_status,
      updated_by = auth.uid()
  where id = p_guest_id;

  perform app_private.write_audit_log(
    'security.clearance_recorded',
    'security_clearance_events',
    v_event.id,
    v_event.camp_id,
    null,
    to_jsonb(v_event),
    p_note
  );

  return v_event;
end;
$$;


-- ============================================================
-- DIRECT WORKFLOW TABLE WRITE LOCKDOWN
-- ============================================================

revoke insert, update, delete, truncate on public.reservations from authenticated;
revoke insert, update, delete, truncate on public.stays from authenticated;
revoke insert, update, delete, truncate on public.room_allocations from authenticated;
revoke insert, update, delete, truncate on public.room_transfers from authenticated;

revoke insert, update, delete, truncate on public.housekeeping_tasks from authenticated;
revoke insert, update, delete, truncate on public.housekeeping_task_items from authenticated;

revoke insert, update, delete, truncate on public.maintenance_tickets from authenticated;
revoke insert, update, delete, truncate on public.maintenance_ticket_updates from authenticated;

revoke insert, update, delete, truncate on public.inspections from authenticated;
revoke insert, update, delete, truncate on public.inspection_items from authenticated;

revoke insert, update, delete, truncate on public.keys_access_cards from authenticated;
revoke insert, update, delete, truncate on public.key_access_card_events from authenticated;

revoke insert, update, delete, truncate on public.room_service_tasks from authenticated;
revoke insert, update, delete, truncate on public.room_service_task_items from authenticated;

revoke insert, update, delete, truncate on public.vip_preparation_checklists from authenticated;
revoke insert, update, delete, truncate on public.vip_preparation_items from authenticated;

revoke insert, update, delete, truncate on public.security_clearance_events from authenticated;

revoke update (current_status) on public.rooms from authenticated;


-- ============================================================
-- LOCK PRIVATE HELPERS
-- ============================================================

revoke all on function app_private.scrub_audit_payload(text, jsonb) from public, anon, authenticated;
revoke all on function app_private.write_audit_log(text, text, uuid, uuid, jsonb, jsonb, text) from public, anon, authenticated;

revoke all on function app_private.assert_active_user() from public, anon, authenticated;
revoke all on function app_private.assert_permission(text) from public, anon, authenticated;
revoke all on function app_private.assert_camp_access(uuid, camp_access_level) from public, anon, authenticated;
revoke all on function app_private.assert_guest_access_in_camp(uuid, uuid) from public, anon, authenticated;
revoke all on function app_private.assert_group_access_in_camp(uuid, uuid) from public, anon, authenticated;

revoke all on function app_private.assert_room_is_allocatable(uuid) from public, anon, authenticated;
revoke all on function app_private.assert_room_can_be_reserved_for_dates(uuid, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke all on function app_private.set_room_status_internal(uuid, room_status, text, text, uuid, uuid) from public, anon, authenticated;
revoke all on function app_private.release_room_after_reservation_change(uuid, text, uuid) from public, anon, authenticated;

revoke all on function app_private.seed_housekeeping_task_items(uuid) from public, anon, authenticated;
revoke all on function app_private.seed_inspection_items(uuid) from public, anon, authenticated;
revoke all on function app_private.seed_vip_preparation_items(uuid) from public, anon, authenticated;

revoke all on function app_private.validate_room_allocation() from public, anon, authenticated;


-- ============================================================
-- LOCK PUBLIC RPC DEFAULT EXECUTION
-- ============================================================

revoke all on function public.create_reservation(uuid, uuid, uuid, timestamptz, timestamptz, boolean, text) from public, anon, authenticated;
revoke all on function public.cancel_reservation(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_reservation_no_show(uuid, text) from public, anon, authenticated;

revoke all on function public.allocate_room(uuid, uuid, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.check_in_stay(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.check_in_reservation(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.check_out_stay(uuid, text, boolean, text) from public, anon, authenticated;

revoke all on function public.request_room_transfer(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.approve_room_transfer(uuid, text) from public, anon, authenticated;
revoke all on function public.execute_room_transfer(uuid, text) from public, anon, authenticated;

revoke all on function public.create_housekeeping_task(uuid, text, task_priority, uuid, text) from public, anon, authenticated;
revoke all on function public.assign_housekeeping_task(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.start_housekeeping_task(uuid) from public, anon, authenticated;
revoke all on function public.complete_housekeeping_task(uuid, jsonb, text) from public, anon, authenticated;

revoke all on function public.create_maintenance_ticket(uuid, text, maintenance_priority, text, boolean) from public, anon, authenticated;
revoke all on function public.assign_maintenance_ticket(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.start_maintenance_work(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_maintenance_resolved(uuid, text) from public, anon, authenticated;
revoke all on function public.verify_maintenance_work(uuid, text) from public, anon, authenticated;

revoke all on function public.complete_inspection(uuid, boolean, jsonb, text) from public, anon, authenticated;

revoke all on function public.create_key_card(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.issue_key_card(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.return_key_card(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_key_card_lost(uuid, text) from public, anon, authenticated;

revoke all on function public.create_room_service_task(uuid, text, task_priority, uuid, timestamptz, text) from public, anon, authenticated;
revoke all on function public.start_room_service_task(uuid) from public, anon, authenticated;
revoke all on function public.complete_room_service_task(uuid, text) from public, anon, authenticated;

revoke all on function public.create_vip_preparation_checklist(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.approve_vip_readiness(uuid, text) from public, anon, authenticated;

revoke all on function public.record_guest_document_access(uuid, text, text) from public, anon, authenticated;
revoke all on function public.create_export_job(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.create_security_clearance_event(uuid, uuid, text, text) from public, anon, authenticated;


-- ============================================================
-- GRANT APPROVED PUBLIC RPCS TO AUTHENTICATED USERS
-- ============================================================

grant execute on function public.create_reservation(uuid, uuid, uuid, timestamptz, timestamptz, boolean, text) to authenticated;
grant execute on function public.cancel_reservation(uuid, text) to authenticated;
grant execute on function public.mark_reservation_no_show(uuid, text) to authenticated;

grant execute on function public.allocate_room(uuid, uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.check_in_stay(uuid, text, uuid) to authenticated;
grant execute on function public.check_in_reservation(uuid, text, uuid) to authenticated;
grant execute on function public.check_out_stay(uuid, text, boolean, text) to authenticated;

grant execute on function public.request_room_transfer(uuid, uuid, text) to authenticated;
grant execute on function public.approve_room_transfer(uuid, text) to authenticated;
grant execute on function public.execute_room_transfer(uuid, text) to authenticated;

grant execute on function public.create_housekeeping_task(uuid, text, task_priority, uuid, text) to authenticated;
grant execute on function public.assign_housekeeping_task(uuid, uuid, text) to authenticated;
grant execute on function public.start_housekeeping_task(uuid) to authenticated;
grant execute on function public.complete_housekeeping_task(uuid, jsonb, text) to authenticated;

grant execute on function public.create_maintenance_ticket(uuid, text, maintenance_priority, text, boolean) to authenticated;
grant execute on function public.assign_maintenance_ticket(uuid, uuid, text) to authenticated;
grant execute on function public.start_maintenance_work(uuid, text) to authenticated;
grant execute on function public.mark_maintenance_resolved(uuid, text) to authenticated;
grant execute on function public.verify_maintenance_work(uuid, text) to authenticated;

grant execute on function public.complete_inspection(uuid, boolean, jsonb, text) to authenticated;

grant execute on function public.create_key_card(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.issue_key_card(uuid, uuid, text) to authenticated;
grant execute on function public.return_key_card(uuid, text) to authenticated;
grant execute on function public.mark_key_card_lost(uuid, text) to authenticated;

grant execute on function public.create_room_service_task(uuid, text, task_priority, uuid, timestamptz, text) to authenticated;
grant execute on function public.start_room_service_task(uuid) to authenticated;
grant execute on function public.complete_room_service_task(uuid, text) to authenticated;

grant execute on function public.create_vip_preparation_checklist(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.approve_vip_readiness(uuid, text) to authenticated;

grant execute on function public.record_guest_document_access(uuid, text, text) to authenticated;
grant execute on function public.create_export_job(uuid, text, text, jsonb) to authenticated;
grant execute on function public.create_security_clearance_event(uuid, uuid, text, text) to authenticated;

commit;