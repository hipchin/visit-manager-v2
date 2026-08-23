# DATA_SCHEMA

## localStorage

  Key              内容
  ---------------- ----------------------
  vm_visits        訪問先一覧
  vm_trash         ゴミ箱
  vm_tags          タグ
  vm_backup_date   最終バックアップ日時
  vm_version       バージョン
  vm_settings      表示設定（訪問件数入力欄のオン・オフ等。JSONバックアップ対象外）

## 訪問先レコード

-   id
-   address
-   displayTitle
-   placeMemo
-   lat
-   lng
-   locationSource
-   name
-   gender
-   lastVisit
-   lastTime
-   memo
-   tags\[\]
-   visitHistory\[\]
-   createdAt
-   updatedAt

## visitHistory の要素

-   date
-   time（不在の場合は未使用）
-   count（任意。時間帯とは別入力の訪問件数。設定でオン時のみ入力・表示）
-   memo
-   absent（不在記録の場合true）

## ゴミ箱

訪問先レコード + deletedAt

30日経過で完全削除。

## IndexedDB

DB名: visit_manager_snap

ObjectStore: snapshots

用途: - 起動時スナップショット - バックアップ用途

メインデータベースではない。

## JSONバックアップ

保持内容

-   version
-   exportedAt
-   visits
-   trash
-   tags

現在はインポート時に完全上書き。
