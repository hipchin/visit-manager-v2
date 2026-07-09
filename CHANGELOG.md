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
