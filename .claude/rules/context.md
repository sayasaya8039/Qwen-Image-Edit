---
paths: "**/*"
---

プロジェクトのコンテキストを読み込み、整理・圧縮します。

## 依存環境チェック（CLAUDE.md読み込み時に必須）

**常に依存環境が最新かをチェック:**

| プロジェクト | チェックコマンド | 更新コマンド |
|-------------|-----------------|-------------|
| Bun/Node.js | `bun outdated` | `bun update` |
| Python | `uv pip list --outdated` | `uv pip install -U` |
| Rust | `cargo outdated` | `cargo update` |

### チェック項目
- 非推奨パッケージがないか
- セキュリティ脆弱性がないか
- メジャーバージョン更新があるか
- 互換性の問題がないか

## MCPサーバー活用

**使えるMCPサーバーは積極的に使用**

## ファイル書き込みルール

**Python、sedコマンドを優先的に使用**

## 実行順序（必須）

### 1. Memory確認
- mcp__memory で過去の作業履歴を取得

### 2. ファイル読み込み
- CLAUDE.md, .claude/settings.json, .claude/rules/*.md

### 3. 依存環境チェック（必須）
- `bun outdated` / `uv pip list --outdated` 実行
- 更新が必要な場合は通知

### 4. 作業内容・Plans保存（圧縮前に必須）
- mcp__memory で保存

### 5. コンテキスト圧縮

### 6. 状況レポート

## コンテキスト容量監視（常時）

LIMIT接近時: Memory保存 → 圧縮 → 通知

$ARGUMENTS でプロジェクトパスを指定可能
