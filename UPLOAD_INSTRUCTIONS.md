# アップロード手順

1. このZIPを解凍する。
2. GitHubリポジトリ `hipchin/visit-manager-v2` のルートへ中身を上書きアップロードする。
3. GitHub上に次の作業用ファイルが残っている場合は削除する。
   - `INDEX_VERSION_PATCH.txt`
   - `INDEX_HTML_VERSION_PATCH.md`
   - `README_UPLOAD.txt`
   - `UPLOAD_AND_REPAIR_INSTRUCTIONS.md`
4. Actions の Deploy が完了するまで待つ。
5. 公開URLを `?v=20260709-update1` 付きで開く。
6. PWA画面に「最新版があります」と出た場合は「更新して再起動」を押す。
7. 表示が古い場合は、設定 → アプリを更新を押す。

この修正では localStorage の保存キーと保存形式は変更していません。
