-- AFOC core schema
-- Notion = canonical record / Supabase = operational state / AFOC = control UI

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.afoc_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','operator','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.afoc_members enable row level security;

create or replace function public.is_afoc_member()
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

revoke all on function public.is_afoc_member() from public;
grant execute on function public.is_afoc_member() to authenticated;

create policy "members can read own membership"
on public.afoc_members
for select
to authenticated
using (user_id = auth.uid() and active = true);

create table if not exists public.development_rooms (
  id text primary key,
  faculty_code text not null,
  faculty_name text not null,
  material_type text not null check (material_type in ('lecture','reading')),
  room_name text,
  status text not null default 'waiting' check (
    status in (
      'waiting','ready','working','checking','approval_wait','done',
      'blocked','stalled','room_full','handoff','resuming'
    )
  ),
  current_course_code text,
  current_unit text,
  current_phase text,
  completed_count integer not null default 0 check (completed_count >= 0),
  total_count integer check (total_count is null or total_count >= 0),
  completed_range text,
  next_step text,
  is_unlocked boolean not null default false,
  notion_page_url text,
  last_checkpoint_id uuid,
  last_heartbeat_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  room_id text references public.development_rooms(id) on delete cascade,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.commands (
  id uuid primary key default gen_random_uuid(),
  room_id text references public.development_rooms(id) on delete cascade,
  command_type text not null,
  instruction text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','claimed','done','cancelled','failed')),
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.development_rooms(id) on delete cascade,
  checkpoint_type text not null default 'progress' check (checkpoint_type in ('progress','handoff','recovery')),
  summary text not null,
  cursor jsonb not null default '{}'::jsonb,
  notion_page_url text,
  created_at timestamptz not null default now()
);

alter table public.development_rooms
  drop constraint if exists development_rooms_last_checkpoint_id_fkey;
alter table public.development_rooms
  add constraint development_rooms_last_checkpoint_id_fkey
  foreign key (last_checkpoint_id) references public.checkpoints(id) on delete set null;

create table if not exists public.completion_notes (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.development_rooms(id) on delete cascade,
  title text not null,
  subtitle text,
  notion_page_url text not null,
  completed_at timestamptz not null default now(),
  seen_at timestamptz
);

create index if not exists idx_activity_events_room_created
  on public.activity_events(room_id, created_at desc);
create index if not exists idx_commands_status_requested
  on public.commands(status, requested_at asc);
create index if not exists idx_checkpoints_room_created
  on public.checkpoints(room_id, created_at desc);
create index if not exists idx_completion_notes_completed
  on public.completion_notes(completed_at desc);

create trigger development_rooms_set_updated_at
before update on public.development_rooms
for each row execute function public.set_updated_at();

create trigger commands_set_updated_at
before update on public.commands
for each row execute function public.set_updated_at();

alter table public.development_rooms enable row level security;
alter table public.activity_events enable row level security;
alter table public.commands enable row level security;
alter table public.checkpoints enable row level security;
alter table public.completion_notes enable row level security;

create policy "members can read rooms"
on public.development_rooms for select to authenticated
using (public.is_afoc_member());
create policy "members can manage rooms"
on public.development_rooms for all to authenticated
using (public.is_afoc_member())
with check (public.is_afoc_member());

create policy "members can read events"
on public.activity_events for select to authenticated
using (public.is_afoc_member());
create policy "members can create events"
on public.activity_events for insert to authenticated
with check (public.is_afoc_member());

create policy "members can read commands"
on public.commands for select to authenticated
using (public.is_afoc_member());
create policy "members can create commands"
on public.commands for insert to authenticated
with check (public.is_afoc_member() and requested_by = auth.uid());
create policy "members can update commands"
on public.commands for update to authenticated
using (public.is_afoc_member())
with check (public.is_afoc_member());

create policy "members can read checkpoints"
on public.checkpoints for select to authenticated
using (public.is_afoc_member());
create policy "members can create checkpoints"
on public.checkpoints for insert to authenticated
with check (public.is_afoc_member());

create policy "members can read completion notes"
on public.completion_notes for select to authenticated
using (public.is_afoc_member());
create policy "members can manage completion notes"
on public.completion_notes for all to authenticated
using (public.is_afoc_member())
with check (public.is_afoc_member());

-- Realtime subscriptions for the live AFOC view.
do $$
begin
  begin
    alter publication supabase_realtime add table public.development_rooms;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.activity_events;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.commands;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.completion_notes;
  exception when duplicate_object then null;
  end;
end $$;

-- Initial Atlas development lines. No fake progress percentages are stored.
insert into public.development_rooms
  (id, faculty_code, faculty_name, material_type, status, is_unlocked)
values
  ('phl-lb','PHL','哲学部','lecture','working',true),
  ('phl-rb','PHL','哲学部','reading','working',true),
  ('rel-rb','REL','宗教学部','reading','working',true),
  ('his-lb','HIS','歴史学部','lecture','working',true),
  ('psy-lb','PSY','心理学部','lecture','working',true),
  ('str-lb','STR','戦略学部','lecture','working',true),
  ('eco-lb','ECO','経済学部','lecture','working',true),
  ('bus-lb','BUS','商学部','lecture','working',true)
on conflict (id) do nothing;
