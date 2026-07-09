# PROJECT_CONTEXT.md

## プロジェクト概要

名称： visit-manager-v2

目的： 飛び込み営業・訪問活動向けの訪問先管理PWA。

最優先事項は

- スマホで素早く使えること
- iPhone Safariで安定動作すること
- データを絶対に失わないこと

である。

---

# 基本設計

画面構成

- 訪問一覧
- 詳細・編集
- ゴミ箱
- 設定

モーダル

- タグ選択
- タグ編集
- 訪問記録
- 不在記録
- 地図選択
- 確認ダイアログ

一覧から詳細編集へ遷移し、保存後一覧へ戻る構成。

---

# データ保存

メイン保存

localStorage

使用キー

- vm_visits
- vm_trash
- vm_tags
- vm_backup_date
- vm_version

補助保存

IndexedDB

用途

起動後スナップショット。起動直後の白画面を避けるため、一覧表示後に遅延実行する。

バックアップ

JSONエクスポート JSONインポート

重要

localStorageを初期化する変更は禁止。キー名称変更は禁止。保存形式変更時は必ず互換処理を実装する。

---

# 起動高速化設計

方針

- 起動直後は、画面表示に必要な処理だけを優先する
- バックアップ通知、ゴミ箱期限チェック、IndexedDBスナップショットは起動後に遅延実行する
- ゴミ箱期限チェックは毎回ではなく1日1回だけ実行する
- 訪問一覧は初回50件だけ描画する
- 追加表示は50件ずつ行う
- データ本体は削らず、描画件数だけを制限する

守ること

- localStorageの全件データは保持する
- 検索・タグフィルター時は全件を対象にする
- 表示件数制限はDOM生成数の制限であり、保存データの削除ではない

---

# 地図設計

アプリ内地図：Leaflet

地図：OpenStreetMap

住所取得：Nominatim Reverse Geocoding

外部ナビ：Google Maps

座標が存在する場合は座標を優先する。

---

# PWA設計

manifestあり

Service Workerあり

ホーム画面追加対応

display: standalone

Service Workerは更新優先。

---

# バージョン更新ルール

更新時は

- index.html
- CSS
- JS
- Service Worker

のバージョン番号を統一する。

今回の高速化バージョン識別子：20260709-speed1

---

# iPhone Safari互換

window.DB window.UI window公開関数 初期化順序は変更しない。

---

# 修正時ルール

変更前

- README確認
- PROJECT_CONTEXT確認
- CHANGELOG確認
- TODO確認

変更後

- README更新（必要時）
- PROJECT_CONTEXT更新
- CHANGELOG更新
- TODO更新

を必ず行う。

---

# 禁止事項

- localStorage削除
- 保存キー変更
- 既存データ破壊
- Safari互換破壊
- PWA更新事故
- 推測による仕様変更
