-- Add the six non-active curriculum lines so AFOC can represent all 7 faculties × Lecture/Reading.
-- These statuses come from the current Atlas development state; no synthetic progress values are used.

insert into public.development_rooms
  (id, faculty_code, faculty_name, material_type, status, is_unlocked)
values
  ('rel-lb','REL','宗教学部','lecture','done',true),
  ('his-rb','HIS','歴史学部','reading','waiting',false),
  ('psy-rb','PSY','心理学部','reading','waiting',false),
  ('str-rb','STR','戦略学部','reading','waiting',false),
  ('eco-rb','ECO','経済学部','reading','waiting',false),
  ('bus-rb','BUS','商学部','reading','waiting',false)
on conflict (id) do update
set status = excluded.status,
    is_unlocked = excluded.is_unlocked,
    updated_at = now();
