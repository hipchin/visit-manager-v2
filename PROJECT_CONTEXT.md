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

このアプリは、訪問先を記録し、再訪問やフォローをしやすくするための個人用訪問管理アプリである。

主な目的は次の通り。

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

このプロジェクトで最も重要なのは次の3点である。

1. スマホで素早く使えること
2. iPhone Safariおよびホーム画面追加PWAで安定動作すること
3. 保存済みの個人データを失わないこと

速度改善やUI改善を行う場合でも、保存済みデータの破壊リスクが少しでもある変更は避ける。

---

## 技術構成

このアプリはビルド工程を持たない、素の静的Webアプリである。

- `index.html`: 画面構造、PWAメタ情報、外部ライブラリ読み込み、各JSファイル読み込み
- `css/style.css`: 画面全体のスタイル、iPhone利用を前提にしたUI調整
- `js/db.js`: データ永続化レイヤー
- `js/tags.js`: タグ色、日付、時間帯などの共通ユーティリティ
- `js/ui.js`: 画面描画、フォーム操作、モーダル、位置情報、地図ピッカー
- `js/app.js`: 初期化、イベントバインド、メインロジック、Service Worker登録
- `manifest.json`: PWA設定
- `sw.js`: Service Worker
- `icons/`: PWAアイコン
- `.github/workflows/deploy.yml`: GitHub Pages用デプロイ設定

外部ライブラリと外部サービスは次の通り。

- Leaflet `1.9.4`: 地図ピッカー表示に使用
- OpenStreetMap タイル: Leaflet地図の背景地図として使用
- Nominatim Reverse Geocoding: 現在地または地図ピンから住所候補を取得するために使用
- Google Maps: 外部ナビ起動に使用

---

## 画面構成

### 1. リスト画面

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

- 訪問先カードを一覧表示する
- 検索キーワードで絞り込む
- タグフィルターで絞り込む
- 古い訪問先を警告表示する
- カードのスワイプで削除ボタンを表示する
- カード内のマップボタンからGoogleマップを開く
- ゴミ箱画面と設定画面へ遷移する
- 新規登録画面へ遷移する

並び順:

- 最終訪問日が古い順
- 最終訪問日がないものは古い扱いになる

起動高速化後の仕様:

- 起動時に一覧の全件DOMを一括生成しない
- 初回表示は50件のみ
- `さらに表示` ボタンで50件ずつ追加表示する
- データ自体は削除しない
- 検索やタグ絞り込みでは既存データ全体を対象にする

注意点:

- 一覧表示は起動速度に直結する
- DOM生成量が増えるとiPhone Safariの白画面時間が伸びやすい
- 保存済みデータ件数が増えた場合は、一覧描画・検索・ソートの負荷を優先的に確認する

---

### 2. 詳細・編集画面

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

役割:

- 訪問先の新規登録
- 訪問先の編集
- 訪問履歴の追加・編集・削除
- 不在履歴の追加・編集・削除
- 現在地から住所・座標を保存
- 地図ピッカーから住所・座標を保存
- 座標または住所を使ってGoogleマップを開く

保存条件:

- `address` または `displayTitle` のどちらかが必要
- `address` が空でも `displayTitle` があれば保存できる

注意点:

- `field-lat` と `field-lng` は画面上には表示されないが、地図連携に重要
- 住所を手入力した場合、既存座標とのズレを避けるため座標をクリアする設計になっている
- 訪問履歴を更新すると、最終訪問日と時間帯が履歴から同期される
- 新規登録時は訪問履歴セクションを表示しない

---

### 3. ゴミ箱画面

主なHTML ID:

- `screen-trash`
- `trash-list`
- `btn-back-trash`

役割:

- 削除した訪問先を表示する
- 削除から30日以内の訪問先を復元できる
- 30日を過ぎた訪問先は期限チェック時に整理される

起動高速化後の仕様:

- ゴミ箱期限チェックは毎回起動直後には実行しない
- `vm_last_trash_purge` を使い、1日1回だけ遅延実行する
- `vm_trash` の保存形式は変更しない

注意点:

- 削除は即時完全削除ではなく、まず `vm_trash` に移動する
- `deletedAt` を基準に30日経過判定をする
- ゴミ箱復元機能は絶対に壊してはいけない

---

### 4. 設定画面

主なHTML ID:

- `screen-settings`
- `tags-list`
- `btn-add-tag`
- `btn-export`
- `btn-import`
- `import-file`
- `btn-update`
- `backup-last-text`
- `version-text`

役割:

- タグの追加・編集・削除
- JSONバックアップのエクスポート
- JSONバックアップからの復元
- アプリの手動更新
- バージョン表示

注意点:

- インポートは現在データを上書きする
- バックアップ未実施または最終バックアップから30日以上経過した場合、リスト画面に通知を出す
- 手動更新はService Worker登録がある場合に動作する

---

## モーダル構成

### タグ選択モーダル

- `modal-tag-picker`
- `tag-picker-list`

役割:

- 訪問先に付けるタグを選択する

### タグ追加・編集モーダル

- `modal-add-tag`
- `new-tag-name`
- `color-picker`

役割:

- タグ名と色を設定する

### 訪問記録モーダル

- `modal-visit`
- `visit-date`
- `visit-time-options`
- `visit-memo`

役割:

- 会えた訪問を履歴に追加・編集する

### 不在記録モーダル

- `modal-absent`
- `absent-date`
- `absent-memo`

役割:

- 不在訪問を履歴に追加・編集する

### 場所選択モーダル

- `modal-location-picker`
- `location-map`
- `location-picker-status`
- `btn-location-current`
- `btn-use-picked-location`

役割:

- Leaflet地図から訪問先の座標を選ぶ
- ピンをドラッグまたは地図タップで位置を決める
- 住所候補を取得できれば住所も保存する
- 住所候補の取得に失敗しても座標は保存できる

### 確認ダイアログ

- `modal-confirm`
- `confirm-message`
- `btn-confirm-cancel`
- `btn-confirm-ok`

役割:

- ブラウザ標準の `confirm()` ではなく、アプリ内UIとして確認を出す
- 削除、上書きインポート、履歴削除などで使用する

---

## データ保存設計

### メイン保存先

メインの永続化には `localStorage` を使う。

主なキー:

- `vm_visits`: 訪問先データ
- `vm_trash`: ゴミ箱データ
- `vm_tags`: タグデータ
- `vm_backup_date`: 最終バックアップ日時
- `vm_version`: バージョン用キー。ただし現状では主に `APP_VERSION` が使われている
- `vm_last_trash_purge`: ゴミ箱期限チェックの最終実行日

絶対禁止:

- `vm_visits` のキー名変更
- `vm_trash` のキー名変更
- `vm_tags` のキー名変更
- `localStorage.clear()` の使用
- 既存データを初期化する処理
- 保存形式を変更して互換処理を入れないこと

### 訪問先データの主な項目

- `id`: 訪問先ID
- `createdAt`: 作成日時
- `updatedAt`: 更新日時
- `address`: 場所・住所
- `displayTitle`: 一覧表示名
- `placeMemo`: 場所メモ
- `lat`: 緯度
- `lng`: 経度
- `locationSource`: 座標取得元
- `name`: 名前
- `gender`: 性別
- `lastVisit`: 最終訪問日
- `lastTime`: 会えた時間帯
- `memo`: メモ
- `tags`: タグID配列
- `visitHistory`: 訪問履歴配列

### ゴミ箱データ

`vm_trash` に保存する。

訪問先データに `deletedAt` を付けて保存する。

復元時は `deletedAt` を削除し、`vm_visits` に戻す。

### タグデータ

`vm_tags` に保存する。

主な項目:

- `id`
- `name`
- `color`

タグ削除時は、訪問先に付いている該当タグIDも除去する。

### バックアップ

JSONエクスポート・JSONインポートで対応する。

エクスポート内容:

- `version`
- `exportedAt`
- `visits`
- `trash`
- `tags`

インポートは現状上書き方式である。

将来的にはマージインポートを検討する。

---

## IndexedDB設計

IndexedDBは補助保存先である。

- DB名: `visit_manager_snap`
- objectStore: `snapshots`
- keyPath: `id`
- 使用ID: `latest`

用途:

- 起動後スナップショット保存
- localStorageを補助する安全策

起動高速化後の仕様:

- 起動直後には実行しない
- 一覧表示後、遅延実行する
- `requestIdleCallback` があれば空き時間に実行する
- `requestIdleCallback` がない環境では `setTimeout` で遅延実行する

注意点:

- IndexedDBをメイン保存先にする変更は大きな設計変更である
- 完全移行する場合は、移行処理・戻し方・バックアップ手順を先に設計する

---

## 起動高速化設計

### 背景

ローカルデータが増えると、PWA起動時に白画面が長くなることがある。

原因候補:

1. localStorageから大きなJSONを読み込む
2. JSON.parseで全件を復元する
3. 訪問一覧を全件ソートする
4. 全件分のDOMを一括生成する
5. 起動直後にIndexedDBスナップショットを作る
6. 起動直後にゴミ箱期限チェックを行う
7. 起動直後にバックアップ通知を更新する

### 現在の改善方針

起動直後は、画面表示に必要な処理を優先する。

起動直後に優先する処理:

1. イベント登録
2. 旧デモデータ整理
3. 必要時のサンプルデータ投入
4. 訪問一覧の初回表示
5. Service Worker登録

起動後に遅延する処理:

1. バックアップ通知更新
2. ゴミ箱期限チェック
3. IndexedDBスナップショット

一覧描画:

- 初回50件
- 追加表示50件ずつ
- データ自体は削らない
- 検索・タグ絞り込みは全件対象

### リスク

- 初回表示に出ない訪問先があるため、ユーザーには「さらに表示」ボタンが必要
- 検索時は全件対象なので、検索負荷は残る
- データ件数がさらに増えた場合は、検索インデックスや集計キャッシュが必要になる

### 戻し方

起動高速化変更で不具合が出た場合は、次を戻す。

1. `js/app.js` の `patchOptimizedListRenderer` 呼び出し
2. 起動後遅延処理 `schedulePostStartupTasks`
3. `vm_last_trash_purge` を使う1日1回制御

ただし `vm_visits`, `vm_trash`, `vm_tags` は絶対に削除しない。

---

## 地図設計

アプリ内地図:

- Leaflet

地図タイル:

- OpenStreetMap

住所取得:

- Nominatim Reverse Geocoding

外部ナビ:

- Google Maps

優先順位:

1. 座標が存在する場合は座標を優先する
2. 座標がない場合は住所または一覧表示名を使う

注意点:

- Google Maps APIキーをフロントエンドに置かない
- 住所だけではピン位置がズレる場合がある
- 座標がある場合は必ず座標を優先する
- 手入力住所に変更した場合は既存座標をクリアする

---

## PWA設計

- `manifest.json` あり
- `sw.js` あり
- iPhoneホーム画面追加対応
- `display: standalone`
- Service Workerは更新優先
- GitHub Pagesで運用する

Service Worker方針:

- 旧キャッシュを削除する
- 通常通信はネットワークを優先する
- `CACHE_VERSION` を更新時に変える
- `clients.claim()` を使う
- 更新時の `skipWaiting()` は、アプリ側の「更新して再起動」操作から送る

更新時の注意点:

- `index.html` のJS/CSSバージョンパラメータを更新する
- `sw.js` の `CACHE_VERSION` を更新する
- `js/db.js` の `APP_VERSION` を更新する
- PWAは古いキャッシュを掴むことがあるため、公開URLにクエリを付けて確認する

---

## バージョン更新ルール

更新時は、次のバージョンを揃える。

- `index.html` のCSS/JS読み込みクエリ
- `sw.js` の `CACHE_VERSION`
- `js/db.js` の `APP_VERSION`
- READMEの反映手順
- CHANGELOGの日付

今回の起動高速化・PWA更新改善版:

- 読み込みクエリ: `20260709-update1`
- Service Workerキャッシュ識別子: `visit-manager-v20260709-update1`
- アプリ内部バージョン: `1.0.9`
- バージョン確認ファイル: `version.json`

---

## iPhone Safari互換

変更時に注意するもの:

- `window.DB`
- `window.UI`
- `window.daysSince`
- `window.daysUntilPurge`
- `window.formatDate`
- `window.timeLabel`
- `window.hexToRgba`
- 初期化順序
- `touchstart`, `touchmove`, `touchend` の扱い
- `passive: false` が必要な箇所
- PWAホーム画面起動時のキャッシュ挙動

禁止:

- `window.DB` や `window.UI` の公開をやめること
- 初期化順序を根拠なく変更すること
- iPhone Safariで未対応の構文を不用意に使うこと
- 既存コメントや保持指定範囲を削除すること

---

## 修正時ルール

変更前に必ず確認する。

1. GitHubリポジトリ確認
2. `README.md` 確認
3. `PROJECT_CONTEXT.md` 確認
4. `CHANGELOG.md` 確認
5. `TODO.md` 確認
6. 関連するHTML/CSS/JS確認

変更後に必ず更新する。

1. `README.md` 更新確認
2. `PROJECT_CONTEXT.md` 更新
3. `CHANGELOG.md` 更新
4. `TODO.md` 更新

コードだけ変更してドキュメントを更新しないことは禁止。

---

## GitHub運用ルール

原則:

- 修正ファイルはアップロード用ZIPとして作成する
- GitHubへ直接変更しない
- ユーザーがファイルを手動アップロードする
- 大きな修正では、目的・影響範囲・リスク・戻し方を先に説明する

今回の反省点:

- GitHubコネクタ経由では大きなファイルが途中で切れることがある
- 完全なソースを取得できていない状態でZIPを作ると、既存コードやドキュメントを壊す危険がある
- 今後は、GitHubからリポジトリ一式ZIPをダウンロードしてから修正する運用を優先する

推奨運用:

1. GitHubから現在のリポジトリZIPをダウンロードする
2. そのZIPをチャットへアップロードする
3. ローカルで全ファイルを確認する
4. 修正ZIPを作成する
5. ユーザーがGitHubへアップロードする

---

## PWA更新改善設計 20260709-update1

目的:

- iPhone Safari / ホーム画面追加PWAで、設定画面の更新ボタンだけに依存しない
- タスクキルしないと最新版に切り替わらない状況を減らす
- ユーザーには「最新版があります」→「更新して再起動」という分かりやすい操作にする

追加ファイル:

- `version.json`

主な仕様:

- `js/app.js` に `APP_BUILD_ID = '20260709-update1'` を定義
- 起動後の遅延処理で `version.json` を `cache: 'no-store'` で取得
- `version.json` の `buildId` と `APP_BUILD_ID` が異なる場合、更新通知を表示
- Service Workerに `waiting` がある場合は `SKIP_WAITING` を送信
- `controllerchange` を検知したら、`?v=<buildId>&reload=<timestamp>` 付きで再読み込み
- Service Worker更新がうまく検知されない場合でも、最終的にバージョン付きURLへ遷移する
- 設定画面の「アプリを更新」は残すが、主導線ではなく保険として扱う

重要:

- localStorageキーは変更しない
- 保存済み訪問データには触れない
- 更新通知はアプリコードの更新だけを扱い、個人データの移行は行わない
- `version.json` の `buildId`、`index.html` の読み込みクエリ、`sw.js` の `CACHE_VERSION`、`db.js` の `APP_VERSION` は更新時に整合させる

---

## 禁止事項

- `localStorage.clear()` を使う
- `vm_visits` を削除する
- `vm_trash` を削除する
- `vm_tags` を削除する
- 保存キーを変更する
- 互換処理なしに保存形式を変更する
- JSONバックアップ互換を壊す
- ゴミ箱復元を壊す
- 座標保存を壊す
- Google Maps起動を壊す
- Service Worker更新を壊す
- Safari互換を壊す
- APIキーや個人情報をフロントエンドへ置く
- 既存コメントや指定保持範囲を削除する
- 推測で仕様を変更する

---

## 今後の優先課題

最優先:

1. 起動時間の実測ログ追加
2. 実データ件数・localStorage容量の診断表示追加
3. 検索速度改善
4. 集計キャッシュ導入

高優先:

1. JSONマージインポート
2. 重複データ検出
3. 座標付きデータ優先保持
4. CSVインポート改善
5. CSVエクスポート追加

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

## 住所手入力とGoogleマップ連携

- 住所の手入力時は、既存座標との不一致を避けるため緯度・経度を空欄にする。
- 空欄の緯度・経度は `null` として扱い、`Number('') === 0` による誤判定を防ぐ。
- 緯度・経度が両方とも有効で、かつ `0,0` ではない場合だけ座標を優先する。
- 有効な座標がない場合は、入力された住所文字列をそのままGoogleマップへ渡す。
- 短縮住所の地域補完は固定せず、Googleマップ側の検索・推測に任せる。
- 既存データに `lat: 0`、`lng: 0` が残っていても、住所検索へフォールバックする。

## iPhone外部遷移とバックアップ保存

- Googleマップ起動では `window.open(..., '_blank')` を使用しない。
- iPhone PWAから外部地図アプリを開く際は、現在の画面を同一遷移させ、一時Safari画面を残さない。
- JSONバックアップはファイル共有に対応する端末ではWeb Share APIを優先する。
- `navigator.share` と `navigator.canShare({ files })` の両方を確認する。
- 共有API非対応環境ではBlob URLと `download` 属性による保存へフォールバックする。
- ユーザーが共有をキャンセルした場合は `vm_backup_date` を更新しない。
- localStorage、JSON形式、インポート互換性は変更しない。
