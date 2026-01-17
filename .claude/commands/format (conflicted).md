---
description: コードフォーマットを実行
allowed-tools: Bash(bun:*), Bash(bunx:*), Bash(prettier:*), Bash(ruff:*), Bash(cargo:*), Read, Glob
argument-hint: [ファイル/ディレクトリ]
---

コードフォーマットを実行します。

## プロジェクト検出

- package.json: !`ls package.json 2>/dev/null || echo "なし"`
- pyproject.toml: !`ls pyproject.toml 2>/dev/null || echo "なし"`
- Cargo.toml: !`ls Cargo.toml 2>/dev/null || echo "なし"`

## 実行内容

1. **フォーマッター検出**
   - Prettier (TypeScript/JavaScript/HTML/CSS)
   - ruff format (Python)
   - cargo fmt (Rust)

2. **フォーマット実行**
   - 対象ファイルを自動検出
   - フォーマット適用

3. **結果レポート**
   - 変更されたファイル数
   - 差分表示（オプション）

## プロジェクト別コマンド

| プロジェクト | コマンド |
|-------------|---------|
| TypeScript/JS | `bunx prettier --write .` |
| Python | `ruff format .` |
| Rust | `cargo fmt` |

## オプション

- `--check`: チェックのみ（変更しない）
- `--diff`: 差分を表示

$ARGUMENTS で特定ファイル/ディレクトリを指定可能。

## 設定ファイル

### Prettier (.prettierrc)
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2
}
```

### Ruff (pyproject.toml)
```toml
[tool.ruff]
line-length = 88
```
