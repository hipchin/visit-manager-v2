# CHANGELOG

## Unreleased

### Added

なし

### Changed

なし

### Fixed

なし

### Removed

なし

---

## 2026-07-09 PWA更新改善版

### Added

- `version.json` を追加し、起動後に最新版ビルドを確認できるようにした
- 新版検知時に「最新版があります」通知を表示する処理を追加
- 「更新して再起動」ボタンを追加
- Service Worker更新後にバージョン付きURLで再読み込みする処理を追加
- 更新通知用のCSSを追加

### Changed

- 設定画面の「アプリを更新」を、Service Worker更新とバージョン付き再読み込みを行う処理へ変更
- `index.html` のCSS/JS読み込みクエリを `20260709-update1` に統一
- アプリ内部バージョンを `1.0.9` に更新
- Service Workerのキャッシュ識別子を `visit-manager-v20260709-update1` に更新
- PWA更新は手動ボタン中心ではなく、起動後の通知中心に変更

### Fixed

- iPhone PWAで設定画面の更新ボタンだけでは最新版に切り替わりにくい問題を軽減
- タスクキルしないと更新されない状況を減らすため、URLバージョン付き再読み込みを追加

### Removed

- リポジトリに残っていた場合、作業用の `INDEX_VERSION_PATCH.txt`、`INDEX_HTML_VERSION_PATCH.md`、`README_UPLOAD.txt`、`UPLOAD_AND_REPAIR_INSTRUCTIONS.md` は削除対象

---

## 2026-07-09 修復版

### Added

- 削られていた `PROJECT_CONTEXT.md` の詳細設計情報を復元
- READMEに起動高速化版の反映手順とデータ保護方針を追記
- 今後の安全な修正運用を明文化
- 不要ファイル削除手順を `UPLOAD_AND_REPAIR_INSTRUCTIONS.md` に追加

### Changed

- `PROJECT_CONTEXT.md` を簡略版から詳細版へ整理
- `README.md` を利用者向け手順と保守方針が分かる構成へ整理
- `TODO.md` を起動高速化後の状態に合わせて整理
- GitHubコネクタだけに依存した修正ではなく、リポジトリZIP基準の修正運用を推奨する方針へ変更

### Fixed

- 直前コミットで `PROJECT_CONTEXT.md` が大きく短縮された問題を修正
- ドキュメント構成と現行仕様の不整合を修正
- 起動高速化版のデータ保護方針が読み取れるよう修正

### Removed

- GitHub上に残っている場合、不要な `INDEX_VERSION_PATCH.txt` は削除対象

---

## 2026-07-09 起動高速化版

### Added

- 起動高速化のため、一覧初回50件描画と50件ずつの追加表示を追加
- 起動後遅延処理を追加
- ゴミ箱期限チェックの1日1回制御を追加
- PROJECT_CONTEXT.md に起動高速化設計を追加

### Changed

- IndexedDBスナップショットを起動直後ではなく起動後に遅延実行するよう変更
- バックアップ通知更新を起動直後ではなく起動後に遅延実行するよう変更
- ゴミ箱期限チェックを毎回起動直後実行から1日1回の遅延実行へ変更
- 訪問一覧描画を全件一括描画から段階描画へ変更
- アプリ内部バージョンを `1.0.8` に更新
- Service Workerのキャッシュ識別子を `visit-manager-v20260709-speed1` に更新

### Fixed

- データ件数増加時に、起動直後の白画面が長くなる可能性を軽減
- 一覧全件DOM生成による初期表示遅延を軽減

### Removed

なし

---

## 2026-07-09 ドキュメント整備

### Added

- PROJECT_CONTEXT.md を追加
- CHANGELOG.md を追加
- TODO.md を追加
- 設計ドキュメントを整備

### Changed

- 設計ルールを文書化
- PWA運用ルールを明文化
- データ保存方針を明文化

### Fixed

なし

### Removed

なし
