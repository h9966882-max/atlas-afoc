-- Move AFOC membership helper out of the exposed public schema.
-- This keeps RLS membership checks available without exposing the SECURITY DEFINER RPC publicly.

create schema if not exists private;

create or replace function private.is_afoc_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.afoc_members m
    where m.user_id = auth.uid()
      and m.active = true
  );
$$;

revoke all on function private.is_afoc_member() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_afoc_member() to authenticated;

alter policy "members can read rooms" on public.development_rooms
  using (private.is_afoc_member());
alter policy "members can manage rooms" on public.development_rooms
  using (private.is_afoc_member())
  with check (private.is_afoc_member());

alter policy "members can read events" on public.activity_events
  using (private.is_afoc_member());
alter policy "members can create events" on public.activity_events
  with check (private.is_afoc_member());

alter policy "members can read commands" on public.commands
  using (private.is_afoc_member());
alter policy "members can create commands" on public.commands
  with check (private.is_afoc_member() and requested_by = auth.uid());
alter policy "members can update commands" on public.commands
  using (private.is_afoc_member())
  with check (private.is_afoc_member());

alter policy "members can read checkpoints" on public.checkpoints
  using (private.is_afoc_member());
alter policy "members can create checkpoints" on public.checkpoints
  with check (private.is_afoc_member());

alter policy "members can read completion notes" on public.completion_notes
  using (private.is_afoc_member());
alter policy "members can manage completion notes" on public.completion_notes
  using (private.is_afoc_member())
  with check (private.is_afoc_member());

create or replace function public.afoc_save_checkpoint(
  p_room_id text,
  p_summary text,
  p_cursor jsonb default '{}'::jsonb,
  p_notion_page_url text default null,
  p_checkpoint_type text default 'progress'
)
returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_checkpoint_id uuid;
begin
  if not private.is_afoc_member() then
    raise exception 'AFOC membership required';
  end if;

  insert into public.checkpoints(room_id, checkpoint_type, summary, cursor, notion_page_url)
  values (p_room_id, p_checkpoint_type, p_summary, coalesce(p_cursor, '{}'::jsonb), p_notion_page_url)
  returning id into v_checkpoint_id;

  update public.development_rooms
  set last_checkpoint_id = v_checkpoint_id,
      notion_page_url = coalesce(p_notion_page_url, notion_page_url),
      last_heartbeat_at = now(),
      updated_at = now()
  where id = p_room_id;

  insert into public.activity_events(room_id, event_type, message, metadata)
  values (
    p_room_id,
    'checkpoint_saved',
    p_summary,
    jsonb_build_object('checkpoint_id', v_checkpoint_id, 'checkpoint_type', p_checkpoint_type)
  );

  return v_checkpoint_id;
end;
$$;

create or replace function public.afoc_set_room_state(
  p_room_id text,
  p_status text,
  p_course_code text default null,
  p_unit text default null,
  p_phase text default null,
  p_next_step text default null,
  p_notion_page_url text default null,
  p_message text default null
)
returns void
language plpgsql
security invoker
set search_path = public, private
as $$
begin
  if not private.is_afoc_member() then
    raise exception 'AFOC membership required';
  end if;

  update public.development_rooms
  set status = p_status,
      current_course_code = coalesce(p_course_code, current_course_code),
      current_unit = coalesce(p_unit, current_unit),
      current_phase = coalesce(p_phase, current_phase),
      next_step = coalesce(p_next_step, next_step),
      notion_page_url = coalesce(p_notion_page_url, notion_page_url),
      last_heartbeat_at = now(),
      updated_at = now()
  where id = p_room_id;

  if not found then
    raise exception 'Unknown AFOC room: %', p_room_id;
  end if;

  insert into public.activity_events(room_id, event_type, message, metadata)
  values (
    p_room_id,
    'state_changed',
    coalesce(p_message, p_status),
    jsonb_build_object('status', p_status, 'course_code', p_course_code, 'unit', p_unit, 'phase', p_phase)
  );
end;
$$;

create or replace function public.afoc_record_completion(
  p_room_id text,
  p_title text,
  p_notion_page_url text,
  p_subtitle text default null,
  p_next_step text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_note_id uuid;
begin
  if not private.is_afoc_member() then
    raise exception 'AFOC membership required';
  end if;

  insert into public.completion_notes(room_id, title, subtitle, notion_page_url)
  values (p_room_id, p_title, p_subtitle, p_notion_page_url)
  returning id into v_note_id;

  update public.development_rooms
  set status = 'done',
      notion_page_url = p_notion_page_url,
      next_step = coalesce(p_next_step, next_step),
      last_heartbeat_at = now(),
      updated_at = now()
  where id = p_room_id;

  insert into public.activity_events(room_id, event_type, message, metadata)
  values (
    p_room_id,
    'completed',
    p_title,
    jsonb_build_object('completion_note_id', v_note_id, 'notion_page_url', p_notion_page_url)
  );

  return v_note_id;
end;
$$;

revoke all on function public.is_afoc_member() from public, anon, authenticated;
drop function if exists public.is_afoc_member();
