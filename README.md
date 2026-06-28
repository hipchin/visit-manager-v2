# 訪問管理アプリ

飛び込み営業・訪問先管理用のPWAアプリです。

## ファイル構成

```text
visit-manager/
├── index.html
├── manifest.json
├── sw.js
├── css/
│   └── style.css
├── js/
│   ├── db.js
│   ├── tags.js
│   ├── ui.js
│   └── app.js
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── .github/
    └── workflows/
        └── deploy.yml
```

## 反映手順

1. ZIPを解凍する
2. GitHubリポジトリのルートに中身をそのままアップロードする
3. 既存ファイルは上書きする
4. Settings → Pages → Build and deployment → Source を `GitHub Actions` にする
5. Actions → Deploy GitHub Pages が緑になるまで待つ
6. 公開URLを `?v=20260627-2` 付きで開く

## 今回の修正点

- `app.js` の `await` 構文エラーを修正
- 初期化時にイベント登録を最優先するよう変更
- Service Workerを再登録し、古いキャッシュを削除する構成に変更
- JS/CSS読み込みにバージョンパラメータを追加
- `db.js` のlocalStorage/IndexedDBまわりを安全化
- 起動時のサンプルデータ自動投入を停止
- GitHub Pages用のActions workflowを追加
- `?debug=1` を付けた時だけ、画面上にJavaScriptエラーを表示

## データ保存

- メインストレージ：localStorage
- 起動時スナップショット：IndexedDB
- バックアップ：JSONエクスポート

既存のlocalStorageデータは、同じドメイン・同じパスで開く限り基本的に残ります。

## v1.0.2

- 旧版で投入された5件のデモデータを検出して削除
- 初回サンプルは1件のみ表示
- 名前が空欄の場合、一覧では「不明」と表示



## v1.0.3

- iPhone Safariで起動時エラー表示がUI初期化に依存して停止する問題を修正。
- キャッシュ回避バージョンを20260627-4に更新。


## 修正メモ

- v1.0.4: iPhone SafariでlocalStorageの旧データ形式が原因で一覧描画が止まる可能性に備え、配列チェックと起動エラー表示を強化。


## v6 修正

- `DB` / `UI` / タグユーティリティを `window.*` に明示公開。
- `app.js` から `window.UI` / `window.DB` を参照する形に変更。
- iPhone Safariで `Cannot access 'UI' before initialization` が出る問題への対策。
- キャッシュ回避バージョンを `20260627-6`、内部バージョンを `1.0.5` に更新。
