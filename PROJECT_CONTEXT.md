# PROJECT_CONTEXT.md

## 目的

このドキュメントは、`visit-manager-v2` の今後の開発・修正・レビュー時に毎回参照するための設計メモである。

コードそのものではなく、アプリの目的、構造、データ設計、画面構成、更新時の注意点を整理する。

今後このリポジトリを修正する場合は、まずこのファイルを読み、既存設計を壊さないことを優先する。

---

## リポジトリ情報

- GitHub フルネーム: `hipchin/visit-manager-v2`
- デフォルトブランチ: `main`
- アプリ名: 訪問管理
- 形式: 静的HTML/CSS/JavaScriptで構成されたPWA
- 主な利用想定: iPhoneでホーム画面に追加して使う訪問先管理アプリ
- デプロイ想定: GitHub Pagesなどの静的ホスティング

---

## アプリの目的

1. 訪問先の場所・住所・名前・性別・メモを保存する
2. 最終訪問日と会えた時間帯を記録する
3. 訪問履歴と不在履歴を残す
4. タグで訪問先を分類する
5. 古くなった訪問先を一覧で把握しやすくする
6. 住所または座標からGoogleマップを開けるようにする
7. データをJSONでバックアップ・復元できるようにする
8. PWAとしてiPhoneのホーム画面から素早く起動できるようにする

---

## 最優先事項

1. スマホで素早く使えること
2. iPhone Safariおよびホーム画面追加PWAで安定動作すること
3. 保存済みの個人データを失わないこと

速度改善やUI改善を行う場合でも、保存済みデータの破壊リスクがある変更は避ける。

---

## 技術構成

- `index.html`: 画面構造、PWAメタ情報、外部ライブラリ読み込み、各JSファイル読み込み
- `css/style.css`: 画面全体のスタイル、iPhone利用を前提にしたUI調整
- `js/db.js`: データ永続化レイヤーと起動中メモリキャッシュ
- `js/tags.js`: タグ色、日付、時間帯の共通ユーティリティ
- `js/ui.js`: 画面描画、フォーム操作、モーダル、位置情報、地図ピッカー
- `js/app.js`: 初期化、イベントバインド、メインロジック、Service Worker登録
- `manifest.json`: PWA設定
- `sw.js`: Service Worker、アプリシェルキャッシュ、更新処理
- `version.json`: 最新ビルド確認用。キャッシュ禁止
- `icons/`: PWAアイコン
- `.github/workflows/deploy.yml`: GitHub Pages用デプロイ設定

外部ライブラリと外部サービス:

- Leaflet `1.9.4`
- OpenStreetMapタイル
- Nominatim Reverse Geocoding
- Google Maps

---

## 画面構成

### リスト画面

主なHTML ID:

- `screen-list`
- `visit-list`
- `search-input`
- `filter-bar`
- `filter-tags-list`
- `btn-filter`
- `btn-filter-clear`
- `btn-trash-nav`
- `btn-settings-nav`
- `btn-add`
- `backup-notice`
- `backup-notice-text`

役割:

- 訪問先カードを一覧表示
- 検索キーワードとタグで絞り込み
- 古い訪問先を警告表示
- スワイプ削除
- Googleマップ起動
- ゴミ箱、設定、新規登録画面への遷移

並び順:

- 最終訪問日が古い順
- 最終訪問日がないものは古い扱い

起動高速化仕様:

- 初回表示は50件
- `さらに表示`で50件ずつ追加
- データ自体は削除しない
- 検索とタグ絞り込みは全件対象

### 詳細・編集画面

主なHTML ID:

- `screen-detail`
- `field-id`
- `field-address`
- `field-display-title`
- `field-place-memo`
- `field-lat`
- `field-lng`
- `field-location-source`
- `field-name`
- `field-gender`
- `field-last-visit`
- `field-memo`
- `time-options`
- `selected-tags`
- `visit-history-section`
- `visit-history-list`
- `btn-save`
- `btn-delete-entry`
- `btn-map-preview`
- `btn-use-current-location`
- `btn-open-location-picker`

保存条件:

- `address`または`displayTitle`のどちらかが必要
- 住所を手入力した場合は既存座標をクリア
- 訪問履歴更新時は最終訪問日と時間帯を同期
- 新規登録時は訪問履歴セクションを表示しない

### ゴミ箱画面

- 削除データは`vm_trash`へ移動
- `deletedAt`から30日以内は復元可能
- 期限チェックは`vm_last_trash_purge`を使い1日1回遅延実行
- 復元機能を壊してはいけない

### 設定画面

- タグ追加・編集・削除
- JSONバックアップ保存
- JSONバックアップ復元
- 手動更新
- バージョン表示
- インポートは現在データを上書き
- 共有キャンセル時は最終バックアップ日を更新しない

---

## モーダル構成

- タグ選択: `modal-tag-picker`
- タグ追加・編集: `modal-add-tag`
- 訪問記録: `modal-visit`
- 不在記録: `modal-absent`
- 場所選択: `modal-location-picker`
- 確認ダイアログ: `modal-confirm`

場所選択モーダル:

- Leaflet地図を使用
- ピンのドラッグまたは地図タップで座標を決定
- Nominatimから住所候補を取得
- 住所取得失敗時も座標は保存可能

---

## データ保存設計

### localStorageキー

- `vm_visits`
- `vm_trash`
- `vm_tags`
- `vm_backup_date`
- `vm_version`
- `vm_last_trash_purge`

絶対禁止:

- キー名変更
- `localStorage.clear()`
- 既存データの初期化
- 互換処理なしの保存形式変更

### 訪問先データ

- `id`
- `createdAt`
- `updatedAt`
- `address`
- `displayTitle`
- `placeMemo`
- `lat`
- `lng`
- `locationSource`
- `name`
- `gender`
- `lastVisit`
- `lastTime`
- `memo`
- `tags`
- `visitHistory`

### ゴミ箱

- `vm_trash`に保存
- `deletedAt`を付与
- 復元時は`deletedAt`を削除し`vm_visits`へ戻す

### タグ

- `id`
- `name`
- `color`
- タグ削除時は訪問先の該当タグIDも除去

### JSONバックアップ

エクスポート項目:

- `version`
- `exportedAt`
- `visits`
- `trash`
- `tags`

現状は上書きインポート。将来はマージインポートを検討する。

---

## 起動中メモリキャッシュ 20260718-speed2

目的:

- 起動中に同じlocalStorage JSONを何度も`JSON.parse`しない
- 保存形式を変えずにCPU負荷と一時メモリ生成を減らす

対象:

- `vm_visits`
- `vm_trash`
- `vm_tags`
- `vm_backup_date`

仕様:

- 初回アクセス時だけlocalStorageから読込
- 2回目以降はメモリ上の正規化済みデータを再利用
- `getVisits`、`getTrash`、`getTags`は配列を複製して返す
- 保存、削除、復元、インポート時はlocalStorageとメモリキャッシュを同時更新
- JSONバックアップ形式は変更しない
- localStorageキーは変更しない
- `null`または空欄の緯度・経度は`null`として維持

リスク:

- 保存関数を経由せずにキャッシュだけを変更すると永続化されない
- 新しいDB操作を追加する場合は必ず`saveVisits`、`saveTrash`、`saveTags`を経由する

戻し方:

- `js/db.js`を更新前へ戻す
- localStorageデータの削除や移行は不要

---

## IndexedDB設計

- DB名: `visit_manager_snap`
- objectStore: `snapshots`
- keyPath: `id`
- 使用ID: `latest`

用途:

- 起動後スナップショット保存
- localStorageを補助する安全策

仕様:

- 起動直後には実行しない
- 一覧表示後に遅延実行
- `requestIdleCallback`があれば空き時間に実行
- 非対応環境では`setTimeout`

IndexedDBをメイン保存先へ変更する場合は、移行処理、戻し方、バックアップ手順を先に設計する。

---

## 起動高速化設計

既存対策:

1. イベント登録を優先
2. 初回一覧50件
3. 追加表示50件
4. バックアップ通知遅延
5. ゴミ箱期限チェック遅延
6. IndexedDBスナップショット遅延

残る負荷:

1. localStorage JSON解析
2. 全件ソート
3. 50件DOM生成
4. 外部Leaflet読込
5. ネットワークからの静的ファイル読込

---

## Service Worker設計 20260718-speed2

### 目的

- PWAの2回目以降の起動をネットワーク速度から切り離す
- 更新通知を維持しながら、HTML、CSS、JavaScriptを即時表示する
- オフラインまたは通信不安定時もアプリ本体を起動できるようにする

### キャッシュ識別子

`visit-manager-v20260718-speed2`

### キャッシュ対象

- `./`
- `index.html`
- `manifest.json`
- バージョン付きCSS
- バージョン付きJavaScript
- PWAアイコン
- Leaflet 1.9.4のCSSとJavaScript

### キャッシュ禁止

- `version.json`
- Nominatim Reverse Geocoding
- OpenStreetMap地図タイル
- Google Maps
- 個人データ
- localStorage内容
- JSONバックアップ

### 応答方式

ナビゲーション:

1. キャッシュがあれば即時表示
2. バックグラウンドでネットワーク取得
3. 成功時は次回用キャッシュを更新
4. キャッシュがなければネットワーク
5. ネットワーク失敗時は`index.html`へフォールバック

静的ファイル:

1. キャッシュがあれば即時返却
2. バックグラウンドで最新版へ更新
3. キャッシュがなければネットワーク

最新版確認:

- `version.json`は`cache: no-store`
- Service Workerからもキャッシュしない
- 従来の「最新版があります」と「更新して再起動」を維持

更新適用:

- `install`時に自動`skipWaiting`しない
- ユーザー操作で`SKIP_WAITING`
- `controllerchange`後に既存処理で再読込
- `activate`時に旧`visit-manager-`キャッシュを削除
- `clients.claim()`を使用

### ホットフィックス方式

今回の変更では次を変更しない。

- `js/app.js`の`APP_BUILD_ID`
- `version.json`の`buildId`
- `js/db.js`の表示用`APP_VERSION`
- `index.html`の読み込みクエリ

理由:

- `version.json`と`APP_BUILD_ID`の不一致が永続し、更新通知が毎回表示される事故を避ける
- Service Workerファイル自体の変更検知で更新を適用できる
- 新しいService Workerが現在のURLから更新済み静的ファイルを`cache: reload`で取得する

---

## 地図設計

- アプリ内地図: Leaflet
- 地図タイル: OpenStreetMap
- 住所取得: Nominatim
- 外部ナビ: Google Maps

優先順位:

1. 有効な座標
2. 住所
3. 一覧表示名

注意点:

- APIキーをフロントエンドへ置かない
- 空欄座標を0として扱わない
- `0,0`は無効
- 手入力住所へ変更した場合は座標をクリア
- 短縮住所はGoogle Maps側の検索へ任せる

---

## iPhone外部遷移とバックアップ保存

- Google Mapsは同一画面から起動
- `window.open(..., '_blank')`は使用しない
- バックアップはWeb Share APIを優先
- `navigator.share`と`navigator.canShare({files})`を確認
- 非対応環境はBlob URLと`download`へフォールバック
- 共有キャンセル時は`vm_backup_date`を更新しない

---

## バージョン更新ルール

通常の機能更新時は次を揃える。

- `index.html`のCSS/JS読み込みクエリ
- `js/app.js`の`APP_BUILD_ID`
- `version.json`の`buildId`と`appVersion`
- `sw.js`の`CACHE_VERSION`
- `js/db.js`の`APP_VERSION`
- README
- PROJECT_CONTEXT
- CHANGELOG
- TODO

Service Workerだけを更新するホットフィックスは例外とし、ドキュメントに理由を記録する。

---

## iPhone Safari互換

変更時に確認するもの:

- `window.DB`
- `window.UI`
- 共通ユーティリティ
- 初期化順序
- タッチイベント
- PWAホーム画面起動
- Service Worker待機・更新・制御切替
- Web Share API
- IndexedDB

禁止:

- `window.DB`や`window.UI`の公開をやめる
- 根拠なく初期化順序を変更
- Safari非対応構文を不用意に使用
- 既存コメントや保持指定範囲を削除

---

## 修正時ルール

変更前:

1. GitHubリポジトリ
2. README
3. PROJECT_CONTEXT
4. CHANGELOG
5. TODO
6. 関連HTML/CSS/JS

変更後:

1. README更新確認
2. PROJECT_CONTEXT更新
3. CHANGELOG更新
4. TODO更新
5. iPhone実機確認
6. JSONバックアップ互換確認

コードだけ変更してドキュメントを更新しないことは禁止。

---

## GitHub運用ルール

- GitHubへ直接変更しない
- 修正ファイルはアップロード用ZIPとして作成
- ユーザーが手動アップロード
- 大きな変更は目的、影響範囲、リスク、戻し方を説明
- 原則として最新リポジトリZIPをチャットへアップロードしてから修正
- GitHubコネクタだけで大きなファイルを再構成しない

推奨運用:

1. GitHubから現在のリポジトリZIPをダウンロード
2. ZIPをチャットへアップロード
3. ローカルで全ファイルを確認
4. 修正ZIPを作成
5. ユーザーがGitHubへアップロード

---

## 禁止事項

- `localStorage.clear()`
- `vm_visits`削除
- `vm_trash`削除
- `vm_tags`削除
- 保存キー変更
- 互換処理なしの保存形式変更
- JSONバックアップ互換破壊
- ゴミ箱復元破壊
- 座標保存破壊
- Google Maps起動破壊
- Service Worker更新破壊
- Safari互換破壊
- APIキーや個人情報をフロントエンドへ配置
- 既存コメントや指定保持範囲削除
- 推測による仕様変更

---

## 今後の優先課題

最優先:

1. 起動時間の実測ログ
2. 実データ件数・localStorage容量の診断表示
3. iPhone実機で今回のキャッシュ効果確認
4. 初回起動時のLeaflet遅延読込

高優先:

1. 検索速度改善
2. JSONマージインポート
3. 重複データ検出
4. 座標付きデータ優先保持
5. CSVインポート・エクスポート

中優先:

1. 地図表示高速化
2. タグ検索改善
3. バックアップ履歴
4. フィルター保存
5. 最近見た訪問先

将来:

1. IndexedDB完全移行検討
2. 地図キャッシュ
3. オフライン改善
4. 一括編集
5. 複数選択削除
6. 複数タグ一括付与
7. お気に入り
