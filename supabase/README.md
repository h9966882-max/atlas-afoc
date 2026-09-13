# AFOC Supabase backend

AFOCの運用状態を保持するためのSupabase構成。

## 役割

- Notion: 正式な教材・正本
- Supabase: 現在位置、状態、指示、Checkpoint、完了イベント
- AFOC: 認証済みユーザー向けの可視化・管制UI

## Migration order

1. `migrations/20260913_afoc_core.sql`
2. `migrations/20260913_afoc_workflow_functions.sql`

## Security

- 全運用テーブルでRLSを有効化。
- `afoc_members` に登録されたユーザーだけが運用データへアクセス可能。
- ブラウザには publishable key のみ配置する。
- `service_role` / admin secret はGitHubへ置かない。
- Magic Linkは `shouldCreateUser: false` で、登録済みアカウントだけに送信する。

## Owner bootstrap

Supabase Authにオーナー用ユーザーを作成した後、そのUUIDを `afoc_members` へ1件だけ登録する。

```sql
insert into public.afoc_members (user_id, role)
values ('<AUTH_USER_UUID>', 'owner');
```

## Core tables

- `development_rooms`: 各Lecture / Reading開発ラインの現在状態
- `activity_events`: 状態変更履歴
- `commands`: AFOCからの指示キュー
- `checkpoints`: 停止・Room Full・引継ぎ復旧の再開地点
- `completion_notes`: 「できたよー！」付箋とNotionリンク
- `afoc_members`: AFOC入館許可

## Workflow helpers

- `afoc_save_checkpoint(...)`
- `afoc_set_room_state(...)`
- `afoc_record_completion(...)`

完了時は `afoc_record_completion` が完了付箋を作り、`notion_page_url` を保存する。AFOCはこのURLを付箋リンクとして表示する。
