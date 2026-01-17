---
description: lint + 型チェック + ファクトチェック
allowed-tools: Bash(bun:*), Bash(bunx:*), Bash(ruff:*), Bash(mypy:*), Bash(cargo:*), Read, Edit, Glob, mcp__context7__*
---

コードの品質チェックとファクトチェックを実行します。

## ファクトチェック（必須）

**開発テストの際はファクトチェックも同時に実行:**

| チェック項目 | 確認方法 | 修正 |
|-------------|---------|------|
| ライブラリAPI | context7で最新仕様確認 | 即修正 |
| 非推奨コード | 公式ドキュメント確認 | 即修正 |
| 型定義 | 最新の型定義確認 | 即修正 |
| インポート文 | 正しいパス確認 | 即修正 |

## 実行内容

### 1. リンター実行
- ESLint (TypeScript/JavaScript): `bunx eslint .`
- ruff (Python): `ruff check .`
- clippy (Rust): `cargo clippy`

### 2. 型チェック
- TypeScript: `bunx tsc --noEmit`
- Python: `mypy .`

### 3. ファクトチェック
- 使用ライブラリの最新仕様を確認
- 非推奨APIがないか確認
- **修正点があれば即座に修正**

## オプション

- `--fix`: 自動修正
- `--lint`: lintのみ
- `--type`: 型チェックのみ

$ARGUMENTS で対象を指定
