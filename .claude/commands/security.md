---
description: セキュリティチェック
allowed-tools: Bash(bun:*), Bash(npm:*), Read, Grep, Glob
argument-hint: [ファイル/ディレクトリ]
---

セキュリティチェックを実行します。

## 実行内容

1. **脆弱性スキャン**
   - 依存関係の脆弱性チェック
   - コードの脆弱性パターン検出

2. **機密情報チェック**
   - APIキー・パスワードの検出
   - .envファイルの確認
   - .gitignoreの確認

3. **レポート生成**
   - 重要度別に分類
   - 修正提案

## チェック項目

| カテゴリ | チェック内容 |
|---------|-------------|
| **XSS** | 入力値のサニタイズ |
| **SQLi** | SQLインジェクション |
| **CSRF** | トークン検証 |
| **Auth** | 認証・認可 |
| **Secrets** | 機密情報の露出 |

## コマンド

Binary file ./claude.exe matches
Binary file ./uv.exe matches

## オプション

- : 依存関係のみ
- : コードのみ
- : 機密情報のみ

$ARGUMENTS で対象を指定。

## 重要度

| レベル | 対応 |
|--------|------|
| Critical | 即座に修正 |
| High | 24時間以内 |
| Medium | 1週間以内 |
| Low | 次回リリースまで |