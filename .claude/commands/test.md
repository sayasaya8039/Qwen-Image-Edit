---
description: テストを実行（ファクトチェック含む）
allowed-tools: Bash(bun:*), Bash(npm:*), Bash(cargo:*), Bash(pytest:*), Bash(python:*), Read, Edit, Glob, Grep
argument-hint: [ディレクトリ/ファイル]
---

テストを実行し、ファクトチェックも同時に行います。

## ファクトチェック（テスト時に必須）

**開発テストの際はファクトチェックも同時に実行:**

| チェック項目 | 内容 | 修正 |
|-------------|------|------|
| API仕様 | 最新ドキュメントと一致するか | 即修正 |
| 依存関係 | 非推奨パッケージがないか | 即更新 |
| 型定義 | 正しい型を使用しているか | 即修正 |
| URL/エンドポイント | 有効なURLか | 即修正 |
| 環境変数 | 正しい変数名か | 即修正 |
| ライブラリ使用法 | 公式推奨の方法か | 即修正 |

## 実行内容

### 1. テスト実行
```bash
bun test          # TypeScript/JavaScript
pytest            # Python
cargo test        # Rust
```

### 2. ファクトチェック
- context7でライブラリの最新仕様を確認
- WebSearchで最新ベストプラクティスを確認
- 非推奨APIの使用がないか確認

### 3. 問題発見時
- **修正点があれば即座に修正**
- 修正後に再テスト
- 修正内容をログ出力

## プロジェクト別コマンド

| プロジェクト | コマンド |
|-------------|---------|
| Bun/Node.js | `bun test` |
| Python | `pytest` |
| Rust | `cargo test` |

## オプション

- `--watch`: ウォッチモード
- `--coverage`: カバレッジ取得
- `--no-fix`: 自動修正しない

$ARGUMENTS で対象を指定
