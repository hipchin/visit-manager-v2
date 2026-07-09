# アップロードと修復手順

## 目的

直前コミットで短くなったMarkdownを修復し、起動高速化版の仕様とドキュメントを整合させます。

## アップロードするもの

このZIPを解凍し、以下をGitHubリポジトリのルートへアップロードしてください。

- `README.md`
- `PROJECT_CONTEXT.md`
- `CHANGELOG.md`
- `TODO.md`
- `js/app.js`
- `js/db.js`
- `sw.js`

既存ファイルは上書きしてください。

## GitHub上で削除するもの

リポジトリ直下に次のファイルが残っている場合は削除してください。

- `INDEX_VERSION_PATCH.txt`

このファイルは修正メモであり、アプリ本体には不要です。

GitHub画面で削除する手順:

1. リポジトリ直下の `INDEX_VERSION_PATCH.txt` を開く
2. 右上の三点メニューまたはゴミ箱アイコンを押す
3. `Delete file` を選ぶ
4. `Commit changes` を押す

## index.html の確認

`index.html` は、このZIPには含めていません。

理由:

- GitHubコネクタ経由では大きなHTMLを完全取得できない場合がある
- 不完全なHTMLを上書きすると画面全体が壊れる危険がある
- 今回は安全のため、HTML全体の差し替えではなく文字列置換だけにする

確認する文字列:

```text
20260630-location1
```

残っている場合は、すべて次に置換してください。

```text
20260709-speed1
```

対象:

- `css/style.css?v=20260630-location1`
- `js/db.js?v=20260630-location1`
- `js/tags.js?v=20260630-location1`
- `js/ui.js?v=20260630-location1`
- `js/app.js?v=20260630-location1`

置換後:

- `css/style.css?v=20260709-speed1`
- `js/db.js?v=20260709-speed1`
- `js/tags.js?v=20260709-speed1`
- `js/ui.js?v=20260709-speed1`
- `js/app.js?v=20260709-speed1`

## 反映後の確認

1. GitHub ActionsのDeployが完了するまで待つ
2. 公開URLを `?v=20260709-speed1` 付きで開く
3. 画面が表示されることを確認する
4. 設定 → アプリを更新を押す
5. PWAを完全に閉じる
6. ホーム画面から開き直す
7. 訪問リストが表示されることを確認する
8. 既存データが残っていることを確認する
9. 一覧下部に `さらに表示` が出る場合、タップして追加表示できることを確認する

## データ保護

今回の修復では、以下を行っていません。

- `localStorage.clear()`
- `vm_visits` の削除
- `vm_trash` の削除
- `vm_tags` の削除
- 保存形式の破壊的変更
- JSONバックアップ形式の破壊的変更
