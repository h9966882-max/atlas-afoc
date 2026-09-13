-- AFOC room-instance tracking and standardized sync helpers.

create table if not exists public.room_instances (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.development_rooms(id) on delete cascade,
  external_room_key text,
  room_label text,
  status text not null default 'active' check (status in ('active','handoff','room_full','closed')),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  handoff_checkpoint_id uuid references public.checkpoints(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_room_instances_active_per_line
  on public.room_instances(room_id)
  where status = 'active';
create index if not exists idx_room_instances_room_started
  on public.room_instances(room_id, started_at desc);

alter table public.room_instances enable row level security;

create policy "members can read room instances"
on public.room_instances for select to authenticated
using (private.is_afoc_member());
create policy "members can manage room instances"
on public.room_instances for all to authenticated
using (private.is_afoc_member())
with check (private.is_afoc_member());

create trigger room_instances_set_updated_at
before update on public.room_instances
for each row execute function public.set_updated_at();

do $$
begin
  begin
    alter publication supabase_realtime add table public.room_instances;
  exception when duplicate_object then null;
  end;
end $$;

create or replace function public.afoc_begin_room_instance(
  p_room_id text,
  p_external_room_key text default null,
  p_room_label text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_id uuid;
begin
  if not private.is_afoc_member() then
    raise exception 'AFOC membership required';
  end if;

  update public.room_instances
  set status='closed', ended_at=coalesce(ended_at, now()), updated_at=now()
  where room_id=p_room_id and status='active';

  insert into public.room_instances(room_id, external_room_key, room_label, metadata)
  values (p_room_id, p_external_room_key, p_room_label, coalesce(p_metadata,'{}'::jsonb))
  returning id into v_id;

  update public.development_rooms
  set room_name=coalesce(p_room_label, room_name),
      status=case when status in ('room_full','handoff','stalled') then 'resuming' else status end,
      last_heartbeat_at=now(), updated_at=now()
  where id=p_room_id;

  insert into public.activity_events(room_id,event_type,message,metadata)
  values (p_room_id,'room_started',coalesce(p_room_label,'新しい開発室を開始'),jsonb_build_object('room_instance_id',v_id));

  return v_id;
end;
$$;

grant execute on function public.afoc_begin_room_instance(text,text,text,jsonb) to authenticated;

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
      last_heartbeat_at=now(), updated_at=now()
  where id=p_room_id;

  if not found then raise exception 'Unknown AFOC room: %', p_room_id; end if;

  update public.room_instances
  set last_seen_at=now(), updated_at=now()
  where room_id=p_room_id and status='active';
end;
$$;

grant execute on function public.afoc_heartbeat(text,text,text,text,text,text) to authenticated;

create or replace function public.afoc_handoff_room(
  p_room_id text,
  p_summary text,
  p_cursor jsonb default '{}'::jsonb,
  p_notion_page_url text default null,
  p_reason text default 'handoff'
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

  insert into public.checkpoints(room_id,checkpoint_type,summary,cursor,notion_page_url)
  values (p_room_id,'handoff',p_summary,coalesce(p_cursor,'{}'::jsonb),p_notion_page_url)
  returning id into v_checkpoint_id;

  update public.room_instances
  set status=case when p_reason='room_full' then 'room_full' else 'handoff' end,
      ended_at=now(), last_seen_at=now(), handoff_checkpoint_id=v_checkpoint_id, updated_at=now()
  where room_id=p_room_id and status='active';

  update public.development_rooms
  set status=case when p_reason='room_full' then 'room_full' else 'handoff' end,
      last_checkpoint_id=v_checkpoint_id,
      notion_page_url=coalesce(p_notion_page_url,notion_page_url),
      next_step=p_summary,
      last_heartbeat_at=now(), updated_at=now()
  where id=p_room_id;

  insert into public.activity_events(room_id,event_type,message,metadata)
  values (p_room_id,p_reason,p_summary,jsonb_build_object('checkpoint_id',v_checkpoint_id));

  return v_checkpoint_id;
end;
$$;

grant execute on function public.afoc_handoff_room(text,text,jsonb,text,text) to authenticated;

create or replace function public.afoc_claim_command(p_command_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, private
as $$
begin
  if not private.is_afoc_member() then raise exception 'AFOC membership required'; end if;
  update public.commands
  set status='claimed', claimed_at=now(), updated_at=now()
  where id=p_command_id and status='queued';
end;
$$;

grant execute on function public.afoc_claim_command(uuid) to authenticated;

create or replace function public.afoc_finish_command(p_command_id uuid, p_success boolean default true)
returns void
language plpgsql
security invoker
set search_path = public, private
as $$
begin
  if not private.is_afoc_member() then raise exception 'AFOC membership required'; end if;
  update public.commands
  set status=case when p_success then 'done' else 'failed' end,
      completed_at=now(), updated_at=now()
  where id=p_command_id;
end;
$$;

grant execute on function public.afoc_finish_command(uuid,boolean) to authenticated;

create or replace view public.afoc_room_health
with (security_invoker=true)
as
select
  r.id,
  r.faculty_code,
  r.faculty_name,
  r.material_type,
  r.status,
  r.current_course_code,
  r.current_unit,
  r.current_phase,
  r.next_step,
  r.last_heartbeat_at,
  r.updated_at,
  case
    when r.status in ('done','waiting') then r.status
    when r.status in ('blocked','stalled','room_full','handoff') then r.status
    when r.last_heartbeat_at is null then 'unknown'
    when r.last_heartbeat_at < now() - interval '60 minutes' then 'stalled'
    when r.last_heartbeat_at < now() - interval '20 minutes' then 'quiet'
    else 'healthy'
  end as health,
  extract(epoch from (now()-coalesce(r.last_heartbeat_at,r.updated_at)))/60.0 as minutes_since_update
from public.development_rooms r;

grant select on public.afoc_room_health to authenticated;
