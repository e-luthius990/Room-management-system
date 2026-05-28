begin;

create or replace function public.create_internal_notification(
  p_recipient_id uuid,
  p_camp_id uuid,
  p_title text,
  p_body text,
  p_category text default 'general',
  p_severity text default 'info',
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_action_href text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_notification_id uuid;
  v_title text;
  v_body text;
  v_category text;
  v_severity text;
  v_action_href text;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('notifications.create');

  v_title := nullif(btrim(coalesce(p_title, '')), '');
  v_body := nullif(btrim(coalesce(p_body, '')), '');
  v_category := lower(btrim(coalesce(p_category, 'general')));
  v_severity := lower(btrim(coalesce(p_severity, 'info')));
  v_action_href := nullif(btrim(coalesce(p_action_href, '')), '');

  if v_title is null or length(v_title) < 3 then
    raise exception 'Notification title is required.'
      using errcode = '22023';
  end if;

  if v_body is null or length(v_body) < 3 then
    raise exception 'Notification body is required.'
      using errcode = '22023';
  end if;

  if v_category not in (
    'general',
    'reservation',
    'stay',
    'housekeeping',
    'maintenance',
    'room_service',
    'security',
    'guest_documents',
    'keys',
    'system'
  ) then
    raise exception 'Invalid notification category.'
      using errcode = '22023';
  end if;

  if v_severity not in ('info', 'success', 'warning', 'urgent') then
    raise exception 'Invalid notification severity.'
      using errcode = '22023';
  end if;

  if v_action_href is not null and left(v_action_href, 1) <> '/' then
    raise exception 'Notification action href must be an internal path.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_recipient_id
      and p.account_status = 'active'
  ) then
    raise exception 'Recipient not found.'
      using errcode = 'P0002';
  end if;

  perform app_private.assert_camp_access(p_camp_id, 'operator');

  insert into public.notifications (
    recipient_id,
    camp_id,
    title,
    body,
    category,
    severity,
    entity_type,
    entity_id,
    action_href,
    created_by,
    updated_by
  )
  values (
    p_recipient_id,
    p_camp_id,
    v_title,
    v_body,
    v_category,
    v_severity,
    nullif(btrim(coalesce(p_entity_type, '')), ''),
    p_entity_id,
    v_action_href,
    auth.uid(),
    auth.uid()
  )
  returning id into v_notification_id;

  perform app_private.write_audit_log(
    'notification.created',
    'notification',
    v_notification_id,
    p_camp_id,
    null,
    jsonb_build_object(
      'recipient_id', p_recipient_id,
      'title', v_title,
      'category', v_category,
      'severity', v_severity,
      'entity_type', p_entity_type,
      'entity_id', p_entity_id
    ),
    null
  );

  return v_notification_id;
end;
$$;

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
    (case when p_assigned_to is null then 'pending' else 'assigned' end)::room_service_task_status,
    coalesce(p_priority, 'normal'::task_priority),
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
    status = (case when v_invalid > 0 then 'completed_with_errors' else 'completed' end)::import_status,
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

commit;
