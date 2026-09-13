-- Distinguish canon bootstrap from live development-room heartbeats.

alter table public.development_rooms
  add column if not exists state_source text not null default 'unverified'
    check (state_source in ('unverified','notion_canon','room_heartbeat','manual')),
  add column if not exists canon_checked_at timestamptz,
  add column if not exists sync_note text;

comment on column public.development_rooms.state_source is
  'Where the displayed current state came from: Notion canon, live room heartbeat, manual, or unverified.';
comment on column public.development_rooms.canon_checked_at is
  'Last time Notion canon was checked for this line.';
comment on column public.development_rooms.sync_note is
  'Human-readable caveat about freshness or reconciliation.';

create or replace function public.afoc_heartbeat(
  p_room_id text,
  p_course_code text default null,
  p_unit text default null,
  p_phase text default null,
  p_next_step text default null,
  p_status text default 'working'
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
  set status=p_status,
      current_course_code=coalesce(p_course_code,current_course_code),
      current_unit=coalesce(p_unit,current_unit),
      current_phase=coalesce(p_phase,current_phase),
      next_step=coalesce(p_next_step,next_step),
      state_source='room_heartbeat',
      sync_note=null,
      last_heartbeat_at=now(), updated_at=now()
  where id=p_room_id;

  if not found then raise exception 'Unknown AFOC room: %', p_room_id; end if;

  update public.room_instances
  set last_seen_at=now(), updated_at=now()
  where room_id=p_room_id and status='active';
end;
$$;

grant execute on function public.afoc_heartbeat(text,text,text,text,text,text) to authenticated;
