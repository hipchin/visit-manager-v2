# ARCHITECTURE

## 構成

index.html ├─ css/style.css ├─ js/db.js ├─ js/tags.js ├─ js/ui.js ├─
js/app.js ├─ manifest.json └─ sw.js

## 責務

db.js - 永続化 - localStorage - IndexedDB

ui.js - 画面描画 - モーダル - 地図 - フォーム

app.js - イベント登録 - 画面遷移 - アプリ初期化

tags.js - タグUI - 色管理 - 共通ユーティリティ

## 起動順

1.  HTML読込
2.  db.js
3.  tags.js
4.  ui.js
5.  app.js
6.  init()
7.  Event登録
8.  Snapshot
9.  一覧描画
10. Service Worker登録

## データの流れ

UI ↓ app.js ↓ db.js ↓ localStorage

描画時

localStorage ↓ db.js ↓ ui.js
