# DEVELOPMENT_RULES

## 毎回の作業手順

1.  README確認
2.  PROJECT_CONTEXT確認
3.  CHANGELOG確認
4.  TODO確認
5.  コード確認
6.  修正
7.  動作確認
8.  ドキュメント更新

## 最優先事項

-   データを壊さない
-   Safari互換維持
-   PWA互換維持
-   localStorage互換維持

## 修正時チェック

-   バージョン番号更新
-   Service Worker確認
-   JSON互換確認
-   ゴミ箱確認
-   タグ確認
-   地図確認

## 禁止事項

-   保存キー変更
-   localStorage削除
-   推測で仕様変更
-   既存コメント削除
-   PWA更新フロー破壊

## ドキュメント更新

コード変更時は必ず

-   PROJECT_CONTEXT.md
-   CHANGELOG.md
-   TODO.md

必要に応じて

-   README.md
-   DATA_SCHEMA.md
-   ARCHITECTURE.md

を更新する。
