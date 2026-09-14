# AFOC Live Room Sync Protocol v1.0

Atlas大学の教材開発チャットを交換可能な作業端末として扱い、長期状態をチャットへ閉じ込めないための同期仕様。

## Responsibility split

- **Notion** — canonical curriculum/material records and formal completion state.
- **Supabase** — operational state, commands, heartbeats, checkpoints, handoffs and completion notes.
- **AFOC** — authenticated visualization/control UI.
- **ChatGPT development room** — replaceable execution terminal. A room may end without ending the development line.

## Line IDs

| Faculty | Lecture | Reading |
| --- | --- | --- |
| Philosophy | `phl-lb` | `phl-rb` |
| Religious Studies | `rel-lb` | `rel-rb` |
| History | `his-lb` | `his-rb` |
| Psychology | `psy-lb` | `psy-rb` |
| Strategy | `str-lb` | `str-rb` |
| Economics | `eco-lb` | `eco-rb` |
| Commerce | `bus-lb` | `bus-rb` |

## Standard live lifecycle

### 1. Open / resume a room

Use `afoc_open_shift` after checking the latest Notion canon.

It:

1. reuses the active `room_instances` row or creates one,
2. sends a heartbeat and current cursor,
3. changes `state_source` to `room_heartbeat`,
4. atomically claims the oldest queued command for that line,
5. stores the claimed command on the active room instance.

Queued commands use `commands.queue_seq`, so FIFO order is stable even when commands share the same timestamp.

### 2. Checkpoint during work

Use `afoc_checkpoint_shift` at meaningful boundaries such as a lecture, Reading Book, section, QA block or other restartable unit.

A checkpoint should preserve at least:

- current course,
- current unit,
- what is complete,
- what remains incomplete,
- the next concrete action,
- unresolved questions,
- the Notion canonical page URL when known.

The AFOC health view treats a live line as `quiet` after 20 minutes without heartbeat and `stalled` after 60 minutes. These are operational warnings, not educational completion judgments.

### 3. Complete a work unit

Use `afoc_complete_shift` only after the relevant Notion save and required QA are complete.

It:

1. writes a checkpoint,
2. completes the currently claimed command if one exists,
3. writes a completion note when a Notion URL is supplied,
4. keeps the line `working` when `p_line_done=false`,
5. auto-claims the next queued command when the line continues,
6. closes the active room instance and marks the line `done` when `p_line_done=true`.

### 4. Handoff / Room Full

Use `afoc_handoff_room` with reason `handoff` or `room_full`.

The handoff checkpoint must preserve current position, completed work, unresolved issues and next action. The replacement chat starts by reading Notion canon plus the latest checkpoint, then calls `afoc_open_shift`.

## Automatic faculty curriculum progress

AFOC can now update faculty-level completion totals from structured progress milestones supplied in the existing `p_cursor` JSON of `afoc_checkpoint_shift` or `afoc_complete_shift`.

Use `curriculum_progress` only when a **new formal milestone is actually reached after the automation baseline was established on 2026-09-14**.

Supported stages:

- `lecture_body` — the entire course Lecture Book body exists and course-level QA is complete.
- `lecture_ready` — the entire course satisfies the faculty's formal delivery conditions, including the required student/LDB/DDB/preflight connections.
- `reading_ready` — the course Reading Book set satisfies formal opening conditions.

Example:

```json
{
  "curriculum_progress": [
    {
      "stage": "lecture_body",
      "course_code": "ECO203",
      "completed_units": 20,
      "course_complete": true
    }
  ]
}
```

If one checkpoint reaches multiple milestones, include multiple entries:

```json
{
  "curriculum_progress": [
    {
      "stage": "lecture_body",
      "course_code": "PHL231",
      "completed_units": 20,
      "course_complete": true
    },
    {
      "stage": "lecture_ready",
      "course_code": "PHL231",
      "completed_units": 20,
      "course_complete": true
    }
  ]
}
```

For formally opened partial Reading Book sets, `course_complete` may remain `false` while `completed_units` increases. Report the same course again with `course_complete=true` only when the entire course reaches formal opening.

### Progress safety rules

- Do **not** report `lecture_body` for 5/20, 10/20 or other in-progress body work. Those belong only in the live cursor.
- Do **not** report `lecture_ready` merely because the body is finished.
- Do **not** report `reading_ready` merely because draft production is finished; QA/canon/opening requirements must be met.
- `completed_units` must come from confirmed canonical course structure, never a guess.
- `course_complete=true` is reserved for the whole course milestone.
- Do not retroactively report milestones that were already included in the 2026-09-14 baseline.

AFOC stores milestones by unique `(faculty_code, stage, course_code)`, so repeated reports update the maximum confirmed unit count instead of double-counting the course.

`afoc_checkpoint_shift` and `afoc_complete_shift` automatically call `afoc_apply_curriculum_progress` when the payload is present. `faculty_curriculum_progress` is a Supabase Realtime table, so AFOC redraws the faculty totals and progress bars after the database update.

For faculties whose total lecture count is not yet canonically fixed, course-count progress can still update automatically; unit-based percentages remain unavailable until the canonical total is known.

## Command states

`queued → claimed → done`

If a command cannot be executed, conflicts with newer explicit user instructions, or contradicts current Notion canon, close it with `afoc_finish_command(..., false)` instead of executing stale instructions.

A command being queued in AFOC does **not** mean an existing ChatGPT room was automatically messaged or started. The room becomes live only when it actively runs the AFOC sync protocol.

## State provenance

AFOC distinguishes where a displayed state came from:

- `notion_canon` — current position reconstructed from Notion formal records; no live room heartbeat yet.
- `room_heartbeat` — a development room has actively reported its working cursor.
- `unverified` — no reliable source has been connected.

The AFOC header summarizes these as `📚` canon-synced lines and `⚡` live-heartbeat lines.

## Security

- AFOC operational tables are protected by RLS.
- RPC execution is available only to authenticated AFOC members; anonymous RPC execution is revoked.
- The public GitHub frontend contains only the Supabase publishable key, never a service-role/admin secret.
- Notion/admin secrets must never be stored in client-side files.

## Current standard RPCs

High-level room operations:

- `afoc_open_shift`
- `afoc_checkpoint_shift`
- `afoc_complete_shift`
- `afoc_handoff_room`

Curriculum progress helper:

- `afoc_apply_curriculum_progress`

Low-level primitives retained for exceptional control:

- `afoc_heartbeat`
- `afoc_save_checkpoint`
- `afoc_record_completion`
- `afoc_claim_command`
- `afoc_claim_next_command`
- `afoc_finish_command`
- `afoc_begin_room_instance`
- `afoc_set_room_state`

## Definition of working live sync

Live sync is considered operational when AFOC can show the current cursor and next step without opening the ChatGPT room, a replacement room can resume from Notion + checkpoint after Room Full, queued commands can be claimed/completed in order, each finished artifact links back to its Notion canonical page, and newly completed course milestones automatically update the faculty curriculum map without manual recounting.
