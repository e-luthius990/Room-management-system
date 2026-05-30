create or replace function public.get_reception_dashboard_snapshot(
  p_camp_ids uuid[] default null,
  p_start_at timestamp with time zone default date_trunc('day', now()),
  p_end_at timestamp with time zone default date_trunc('day', now()) + interval '1 day',
  p_now_at timestamp with time zone default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_arrivals_today integer;
  v_departures_today integer;
  v_pending_reservations integer;
  v_active_stays integer;
  v_pending_reception integer;
  v_expected_arrivals_active integer;
  v_expected_arrivals_today integer;
  v_field_absences_active integer;
  v_field_absences_overdue integer;
  v_arrivals jsonb;
  v_departures jsonb;
  v_pending_reception_items jsonb;
  v_expected_arrival_items jsonb;
  v_field_absence_items jsonb;
begin
  select count(*)::integer
  into v_arrivals_today
  from public.reservations r
  where r.expected_arrival_at >= p_start_at
    and r.expected_arrival_at < p_end_at
    and r.status in ('pending', 'confirmed')
    and (p_camp_ids is null or r.camp_id = any(p_camp_ids));

  select count(*)::integer
  into v_departures_today
  from public.stays s
  where s.expected_departure_at >= p_start_at
    and s.expected_departure_at < p_end_at
    and s.status in ('occupied', 'checked_in')
    and (p_camp_ids is null or s.camp_id = any(p_camp_ids));

  select count(*)::integer
  into v_pending_reservations
  from public.reservations r
  where r.status in ('pending', 'confirmed')
    and (p_camp_ids is null or r.camp_id = any(p_camp_ids));

  select count(*)::integer
  into v_active_stays
  from public.stays s
  where s.status in ('occupied', 'checked_in')
    and (p_camp_ids is null or s.camp_id = any(p_camp_ids));

  select count(*)::integer
  into v_pending_reception
  from public.security_clearance_events e
  where e.sent_to_reception_at is not null
    and coalesce(e.reception_status, 'pending') = 'pending'
    and e.exit_at is null
    and (p_camp_ids is null or e.camp_id = any(p_camp_ids));

  select count(*)::integer
  into v_expected_arrivals_active
  from public.expected_arrivals ea
  where ea.status = 'expected'
    and (p_camp_ids is null or ea.camp_id = any(p_camp_ids));

  select count(*)::integer
  into v_expected_arrivals_today
  from public.expected_arrivals ea
  where ea.status = 'expected'
    and ea.expected_arrival_at >= p_start_at
    and ea.expected_arrival_at < p_end_at
    and (p_camp_ids is null or ea.camp_id = any(p_camp_ids));

  select count(*)::integer
  into v_field_absences_active
  from public.field_absences fa
  where fa.status = 'away'
    and (p_camp_ids is null or fa.camp_id = any(p_camp_ids));

  select count(*)::integer
  into v_field_absences_overdue
  from public.field_absences fa
  where fa.status = 'away'
    and fa.expected_return_at < p_now_at
    and (p_camp_ids is null or fa.camp_id = any(p_camp_ids));

  select coalesce(jsonb_agg(item order by sort_at asc), '[]'::jsonb)
  into v_arrivals
  from (
    select
      r.expected_arrival_at as sort_at,
      jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'expected_arrival_at', r.expected_arrival_at,
        'guest', jsonb_build_object('id', g.id, 'full_name', g.full_name),
        'room', jsonb_build_object(
          'id', rm.id,
          'room_number', rm.room_number,
          'building', jsonb_build_object('id', b.id, 'name', b.name, 'code', b.code)
        )
      ) as item
    from public.reservations r
    left join public.guests g on g.id = r.guest_id
    left join public.rooms rm on rm.id = r.room_id
    left join public.buildings b on b.id = rm.building_id
    where r.expected_arrival_at >= p_start_at
      and r.expected_arrival_at < p_end_at
      and r.status in ('pending', 'confirmed')
      and (p_camp_ids is null or r.camp_id = any(p_camp_ids))
    order by r.expected_arrival_at asc
    limit 5
  ) rows;

  select coalesce(jsonb_agg(item order by sort_at asc), '[]'::jsonb)
  into v_departures
  from (
    select
      s.expected_departure_at as sort_at,
      jsonb_build_object(
        'id', s.id,
        'status', s.status,
        'expected_departure_at', s.expected_departure_at,
        'guest', jsonb_build_object('id', g.id, 'full_name', g.full_name),
        'room', jsonb_build_object(
          'id', rm.id,
          'room_number', rm.room_number,
          'building', jsonb_build_object('id', b.id, 'name', b.name, 'code', b.code)
        )
      ) as item
    from public.stays s
    left join public.guests g on g.id = s.guest_id
    left join public.rooms rm on rm.id = s.room_id
    left join public.buildings b on b.id = rm.building_id
    where s.expected_departure_at >= p_start_at
      and s.expected_departure_at < p_end_at
      and s.status in ('occupied', 'checked_in')
      and (p_camp_ids is null or s.camp_id = any(p_camp_ids))
    order by s.expected_departure_at asc
    limit 5
  ) rows;

  select coalesce(jsonb_agg(item order by sort_at asc), '[]'::jsonb)
  into v_pending_reception_items
  from (
    select
      e.sent_to_reception_at as sort_at,
      jsonb_build_object(
        'security_event_id', e.id,
        'guest_id', e.guest_id,
        'guest_full_name', g.full_name,
        'guest_phone', g.phone,
        'guest_document_number', g.id_or_passport_number,
        'guest_nationality', g.nationality,
        'camp_id', e.camp_id,
        'camp_name', c.name,
        'clearance_status', e.clearance_status,
        'risk_level', e.risk_level,
        'visit_type', e.visit_type,
        'purpose', e.purpose,
        'host_name', e.host_name,
        'host_department', e.host_department,
        'sent_to_reception_at', e.sent_to_reception_at,
        'reception_status', e.reception_status
      ) as item
    from public.security_clearance_events e
    left join public.guests g on g.id = e.guest_id
    left join public.camps c on c.id = e.camp_id
    where e.sent_to_reception_at is not null
      and coalesce(e.reception_status, 'pending') = 'pending'
      and e.exit_at is null
      and (p_camp_ids is null or e.camp_id = any(p_camp_ids))
    order by e.sent_to_reception_at asc
    limit 5
  ) rows;

  select coalesce(jsonb_agg(item order by sort_at asc), '[]'::jsonb)
  into v_expected_arrival_items
  from (
    select
      ea.expected_arrival_at as sort_at,
      jsonb_build_object(
        'expected_arrival_id', ea.id,
        'guest_id', ea.guest_id,
        'guest_name', g.full_name,
        'guest_phone', g.phone,
        'guest_organization', g.organization,
        'camp_id', ea.camp_id,
        'camp_name', c.name,
        'expected_arrival_at', ea.expected_arrival_at,
        'expected_departure_at', ea.expected_departure_at,
        'purpose', ea.purpose,
        'host_name', ea.host_name,
        'host_department', ea.host_department,
        'status', ea.status,
        'is_overdue', ea.expected_arrival_at < p_now_at,
        'created_at', ea.created_at,
        'updated_at', ea.updated_at,
        'allocated_at', ea.allocated_at
      ) as item
    from public.expected_arrivals ea
    left join public.guests g on g.id = ea.guest_id
    left join public.camps c on c.id = ea.camp_id
    where ea.status = 'expected'
      and (p_camp_ids is null or ea.camp_id = any(p_camp_ids))
    order by ea.expected_arrival_at asc
    limit 5
  ) rows;

  select coalesce(jsonb_agg(item order by sort_at asc), '[]'::jsonb)
  into v_field_absence_items
  from (
    select
      fa.expected_return_at as sort_at,
      jsonb_build_object(
        'field_absence_id', fa.id,
        'stay_id', fa.stay_id,
        'guest_id', fa.guest_id,
        'guest_name', g.full_name,
        'guest_phone', g.phone,
        'guest_organization', g.organization,
        'camp_id', fa.camp_id,
        'camp_name', c.name,
        'room_number', rm.room_number,
        'departure_at', fa.departure_at,
        'expected_return_at', fa.expected_return_at,
        'destination', fa.destination,
        'reason', fa.reason,
        'status', fa.status,
        'days_away', greatest(0, floor(extract(epoch from (p_now_at - fa.departure_at)) / 86400))::integer,
        'days_until_return', floor(extract(epoch from (fa.expected_return_at - p_now_at)) / 86400)::integer,
        'is_overdue', fa.expected_return_at < p_now_at,
        'created_at', fa.created_at,
        'updated_at', fa.updated_at,
        'actual_return_at', fa.actual_return_at
      ) as item
    from public.field_absences fa
    left join public.guests g on g.id = fa.guest_id
    left join public.camps c on c.id = fa.camp_id
    left join public.rooms rm on rm.id = fa.room_id
    where fa.status = 'away'
      and (p_camp_ids is null or fa.camp_id = any(p_camp_ids))
    order by fa.expected_return_at asc
    limit 5
  ) rows;

  return jsonb_build_object(
    'counts', jsonb_build_object(
      'arrivalsToday', v_arrivals_today,
      'departuresToday', v_departures_today,
      'pendingReservations', v_pending_reservations,
      'activeStays', v_active_stays,
      'pendingReception', v_pending_reception,
      'expectedArrivalsActive', v_expected_arrivals_active,
      'expectedArrivalsToday', v_expected_arrivals_today,
      'fieldAbsencesActive', v_field_absences_active,
      'fieldAbsencesOverdue', v_field_absences_overdue
    ),
    'arrivals', v_arrivals,
    'departures', v_departures,
    'pendingReceptionItems', v_pending_reception_items,
    'expectedArrivalItems', v_expected_arrival_items,
    'fieldAbsenceItems', v_field_absence_items
  );
end;
$$;
