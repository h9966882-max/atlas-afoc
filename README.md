# Atlas Faculty Operations Center (AFOC)

Atlas大学の教材開発を一画面で把握するための管制塔プロトタイプ。

## v0.1 の目的

- 7学部 × Lecture Book / Reading Book の現在地を可視化
- 稼働中・完了・前工程待ちを一目で確認
- AI Faculty の作業を「職員室」として箱庭表示
- 完了時に「書類を持つ → 完了BOX → 付箋 → 席へ戻る → 次の仕事」のアニメーションを実演
- Activity Feed で状態変化を表示

## 現在の構成

- `index.html` — 画面構造
- `styles.css` — AtlasらしいUIとアニメーション表現
- `app.js` — 教材ラインの表示、Facultyの動き、Activity Feed

## 今後

1. Supabase Free と接続して開発状態をデータ化
2. 各開発室の現在地・科目コード・工程・最終更新を反映
3. Activity Feed を実データ化
4. Notion正本との役割分担を固定
5. 承認待ち・指示・AI自動振り分けへ段階的に拡張

> Notion = 正本 / Supabase = 運用状態 / AFOC = 見える管制塔
