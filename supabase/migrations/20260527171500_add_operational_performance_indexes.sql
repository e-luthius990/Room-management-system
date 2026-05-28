begin;

create extension if not exists pg_trgm with schema extensions;

create index if not exists idx_guests_active_created
  on public.guests (created_at desc)
  where archived_at is null;

create index if not exists idx_guests_active_camp_created
  on public.guests (primary_camp_id, created_at desc)
  where archived_at is null;

create index if not exists idx_guests_active_camp_name
  on public.guests (primary_camp_id, full_name)
  where archived_at is null;

create index if not exists idx_guests_active_name_trgm
  on public.guests using gin (full_name gin_trgm_ops)
  where archived_at is null;

create index if not exists idx_guests_active_org_trgm
  on public.guests using gin (organization gin_trgm_ops)
  where archived_at is null and organization is not null;

create index if not exists idx_guests_active_phone_trgm
  on public.guests using gin (phone gin_trgm_ops)
  where archived_at is null and phone is not null;

create index if not exists idx_guests_active_email_trgm
  on public.guests using gin (email gin_trgm_ops)
  where archived_at is null and email is not null;

create index if not exists idx_guests_active_passport_trgm
  on public.guests using gin (id_or_passport_number gin_trgm_ops)
  where archived_at is null and id_or_passport_number is not null;

create index if not exists idx_rooms_active_board
  on public.rooms (camp_id, current_status, room_number)
  where deleted_at is null;

create index if not exists idx_rooms_active_building_room
  on public.rooms (building_id, room_number)
  where deleted_at is null;

create index if not exists idx_rooms_active_type_room
  on public.rooms (room_type_id, room_number)
  where deleted_at is null;

create index if not exists idx_rooms_active_room_number_trgm
  on public.rooms using gin (room_number gin_trgm_ops)
  where deleted_at is null;

create index if not exists idx_stays_status_expected_departure
  on public.stays (status, expected_departure_at);

create index if not exists idx_stays_camp_status_expected_arrival
  on public.stays (camp_id, status, expected_arrival_at);

create index if not exists idx_stays_guest_expected_arrival
  on public.stays (guest_id, expected_arrival_at desc);

create index if not exists idx_stays_room_status_checked_in
  on public.stays (room_id, status, checked_in_at desc);

create index if not exists idx_stays_reservation_camp
  on public.stays (reservation_id, camp_id)
  where reservation_id is not null;

create index if not exists idx_reservations_status_expected_arrival
  on public.reservations (status, expected_arrival_at);

create index if not exists idx_reservations_camp_status_expected_arrival
  on public.reservations (camp_id, status, expected_arrival_at);

create index if not exists idx_reservations_guest_expected_arrival
  on public.reservations (guest_id, expected_arrival_at desc)
  where guest_id is not null;

create index if not exists idx_reservations_room_status_dates
  on public.reservations (room_id, status, expected_arrival_at, expected_departure_at);

create index if not exists idx_expected_arrivals_camp_status_arrival
  on public.expected_arrivals (camp_id, status, expected_arrival_at);

create index if not exists idx_expected_arrivals_status_arrival
  on public.expected_arrivals (status, expected_arrival_at);

create index if not exists idx_expected_arrivals_guest_arrival
  on public.expected_arrivals (guest_id, expected_arrival_at desc)
  where guest_id is not null;

create index if not exists idx_field_absences_camp_status_return
  on public.field_absences (camp_id, status, expected_return_at);

create index if not exists idx_field_absences_status_return
  on public.field_absences (status, expected_return_at);

create index if not exists idx_field_absences_stay_status
  on public.field_absences (stay_id, status);

create index if not exists idx_field_absences_guest_status
  on public.field_absences (guest_id, status);

create index if not exists idx_room_allocations_status_allocated
  on public.room_allocations (status, allocated_at desc);

create index if not exists idx_room_allocations_stay_allocated
  on public.room_allocations (stay_id, allocated_at desc)
  where stay_id is not null;

create index if not exists idx_room_allocations_room_status
  on public.room_allocations (room_id, status);

create index if not exists idx_room_allocations_reservation
  on public.room_allocations (reservation_id)
  where reservation_id is not null;

create index if not exists idx_security_events_open_reception_handoffs
  on public.security_clearance_events (sent_to_reception_at, camp_id, guest_id)
  where event_type = 'sent_to_reception'
    and reception_received_at is null
    and related_reservation_id is null
    and related_stay_id is null;

create index if not exists idx_security_events_guest_entry_open
  on public.security_clearance_events (guest_id, entry_at desc)
  where exit_at is null;

create index if not exists idx_security_events_exit_at
  on public.security_clearance_events (exit_at desc)
  where exit_at is not null;

create index if not exists idx_audit_logs_camp_created
  on public.audit_logs (camp_id, created_at desc)
  where camp_id is not null;

create index if not exists idx_audit_logs_action_created
  on public.audit_logs (action, created_at desc);

create index if not exists idx_audit_logs_entity_created
  on public.audit_logs (entity_type, created_at desc);

create index if not exists idx_profiles_active_name
  on public.profiles (account_status, full_name);

create index if not exists idx_user_roles_active_user
  on public.user_roles (user_id, role_id)
  where revoked_at is null;

create index if not exists idx_user_camp_access_active_user
  on public.user_camp_access (user_id, camp_id)
  where revoked_at is null;

commit;
