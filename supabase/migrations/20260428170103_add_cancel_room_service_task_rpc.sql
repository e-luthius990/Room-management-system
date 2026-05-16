begin;

create or replace function public.cancel_room_service_task(
  p_task_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_task public.room_service_tasks%rowtype;
  v_actor_id uuid;
  v_reason text;
  v_old_value jsonb;
  v_new_value jsonb;
begin
  perform app_private.assert_active_user();
  perform app_private.assert_permission('room_service.cancel_task');

  v_actor_id := auth.uid();
  v_reason := nullif(btrim(coalesce(p_reason, '')), '');

  if v_reason is null or length(v_reason) < 3 then
    raise exception 'Cancellation reason is required.'
      using errcode = '22023';
  end if;

  select *
  into v_task
  from public.room_service_tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Room service task not found.'
      using errcode = 'P0002';
  end if;

  perform app_private.assert_camp_access(v_task.camp_id, 'operator');

  if v_task.status not in ('pending', 'assigned') then
    raise exception 'Invalid room service task status for cancellation.'
      using errcode = 'P0001';
  end if;

  v_old_value := to_jsonb(v_task);

  update public.room_service_tasks
  set
    status = 'cancelled',
    cancellation_reason = v_reason,
    cancelled_at = now(),
    updated_at = now(),
    updated_by = v_actor_id
  where id = p_task_id
  returning *
  into v_task;

  v_new_value := to_jsonb(v_task);

  perform app_private.write_audit_log(
    'room_service_task.cancelled',
    'room_service_task',
    v_task.id,
    v_task.camp_id,
    v_old_value,
    v_new_value,
    v_reason
  );

  return v_task.id;
end;
$$;

revoke all on function public.cancel_room_service_task(uuid, text) from public;
revoke all on function public.cancel_room_service_task(uuid, text) from anon;
grant execute on function public.cancel_room_service_task(uuid, text) to authenticated;

commit;