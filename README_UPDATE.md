# 住所手入力時のGoogleマップ修正

## 内容

住所を手入力した場合に、空欄の緯度・経度が `0,0` として扱われる問題を修正します。

修正後は次の動作になります。

- 現在地・地図選択で有効な座標がある場合：座標を優先
- 手入力で座標がない場合：入力住所をそのままGoogleマップへ渡す
- `岸谷4-4-4` のような短縮住所：Googleマップ側の予測に任せる
- 既存データに `0,0` がある場合：住所検索へ自動フォールバック
- localStorageのキーと保存データは削除しない

## 手順

1. GitHubの `hipchin/visit-manager-v2` から最新ZIPをダウンロードします。
2. ZIPを解凍します。
3. この更新ZIP内の `update_tool` フォルダを、解凍したリポジトリのルートへコピーします。
4. `update_tool/apply_update.command` をダブルクリックします。
5. macOSに実行を拒否された場合は、右クリック → 開く を選びます。
6. 「修正完了」と表示されたら、リポジトリ内の更新ファイルをGitHubへアップロードします。
7. `update_tool` と `_mapfix_backup` はGitHubへアップロードしません。

## GitHubへアップロードするファイル

- `index.html`
- `sw.js`
- `version.json`
- `js/ui.js`
- `js/app.js`
- `js/db.js`（バージョン文字列が存在した場合）
- `README.md`
- `PROJECT_CONTEXT.md`
- `CHANGELOG.md`
- `TODO.md`

## 戻し方

実行前の対象ファイルは `_mapfix_backup` に自動保存されます。問題があれば、その中身を元の場所へ戻してください。
