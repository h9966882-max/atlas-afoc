# Atlas Faculty Operations Center (AFOC)

Atlas大学の教材開発を一画面で把握するための、箱庭型オペレーションセンター。

> Notion = 正式正本 / Supabase = リアルタイム運用状態 / AFOC = 可視化・管制UI / ChatGPT開発室 = 交換可能な作業端末

## Current implementation

- 🔐 Supabase Authによるログインゲート
- 🐅 Lecture Faculty / 🐥 Reading Faculty のAtlasマスコット職員室UI
- 7学部 × Lecture Book / Reading Book = 14開発ラインをSupabaseで管理
- 現在地・工程・次工程・heartbeat・health表示
- `notion_canon` と `room_heartbeat` を分離した状態provenance
- AFOCからの指示キュー (`queued → claimed → done/failed`)
- FIFOを保証する `commands.queue_seq`
- Room Instance / Checkpoint / Room Full / Handoff / Resume
- Notion正本へ戻れる完了付箋
- 未ログイン利用者からAFOC運用データを読めないRLS

## Live room lifecycle

教材開発室の標準同期は次の3操作。

1. `afoc_open_shift` — 出勤・Room Instance作成/再利用・heartbeat・最古指示claim
2. `afoc_checkpoint_shift` — 作業中heartbeat・再開Checkpoint保存
3. `afoc_complete_shift` — 完了Checkpoint・指示完了・完了付箋・次指示claim

Room Full / 別チャットへの引継ぎは `afoc_handoff_room` を使う。

詳細: [`docs/live-room-protocol.md`](docs/live-room-protocol.md)

## UI files

- `secure.html` — 認証付きAFOC入口・指示パネル
- `secure.js` — Supabase Auth / Realtime / operational state
- `atelier.html` — Atlasマスコット職員室
- `atelier-side.html` — Live stateを職員室へ反映するwrapper
- `afoc-config.js` — 公開可能なSupabase接続設定
- `index.html` / `styles.css` / `app.js` — 初期プロトタイプ（履歴保持）

## Operational truth

AFOCに指示を登録しただけで、既存のChatGPTチャットルームへ外部から自動送信・自動起動されるわけではない。

各教材開発室がLive同期プロトコルを実行した時点で `⚡ room_heartbeat` になり、それまではNotion正本から確認した `📚 notion_canon` 状態として表示する。

## Next

- 現在稼働中の8教材開発室へLive同期を順次接続
- AFOC詳細カードでRoom Instance・claimed command・state provenanceをさらに可視化
- 完了アニメーションを実イベントと接続
- 将来: Orchestratorによる指示振り分け → AI実行 → QA → 承認 → Notion正本化
