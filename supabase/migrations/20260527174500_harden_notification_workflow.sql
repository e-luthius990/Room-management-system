begin;

create index if not exists idx_notifications_legacy_user_inbox
  on public.notifications (user_id, read_at, created_at desc)
  where archived_at is null and user_id is not null;

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
    user_id,
    recipient_id,
    camp_id,
    title,
    message,
    body,
    type,
    category,
    severity,
    status,
    entity_type,
    entity_id,
    action_href,
    created_by,
    updated_by
  )
  values (
    p_recipient_id,
    p_recipient_id,
    p_camp_id,
    v_title,
    v_body,
    v_body,
    v_category,
    v_category,
    v_severity,
    'unread',
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

create or replace function public.mark_notification_read(
  p_notification_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_notification public.notifications%rowtype;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('notifications.mark_read');

  select *
  into v_notification
  from public.notifications
  where id = p_notification_id
  and archived_at is null
  for update;

  if not found then
    raise exception 'Notification not found.'
      using errcode = 'P0002';
  end if;

  if coalesce(v_notification.recipient_id, v_notification.user_id) is distinct from auth.uid() then
    perform app_private.assert_camp_access(v_notification.camp_id, 'manager');
  end if;

  update public.notifications
  set
    status = 'read',
    read_at = coalesce(read_at, now()),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_notification_id;

  return p_notification_id;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_count integer;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('notifications.mark_read');

  update public.notifications
  set
    status = 'read',
    read_at = coalesce(read_at, now()),
    updated_by = auth.uid(),
    updated_at = now()
  where (recipient_id = auth.uid() or user_id = auth.uid())
  and read_at is null
  and archived_at is null;

  get diagnostics v_count = row_count;

  return v_count;
end;
$$;

create or replace function public.archive_notification(
  p_notification_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_notification public.notifications%rowtype;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('notifications.archive');

  select *
  into v_notification
  from public.notifications
  where id = p_notification_id
  and archived_at is null
  for update;

  if not found then
    raise exception 'Notification not found.'
      using errcode = 'P0002';
  end if;

  if coalesce(v_notification.recipient_id, v_notification.user_id) is distinct from auth.uid() then
    perform app_private.assert_camp_access(v_notification.camp_id, 'manager');
  end if;

  update public.notifications
  set
    status = 'archived',
    archived_at = now(),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_notification_id;

  return p_notification_id;
end;
$$;

commit;
