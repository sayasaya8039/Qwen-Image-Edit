---
description: README.mdを自動生成
allowed-tools: Read, Write, Glob, Grep, Bash(git:*)
argument-hint: [プロジェクトパス]
---

プロジェクト構造を分析してREADME.mdを自動生成します。

## 実行内容

### 1. プロジェクト分析
- ディレクトリ構造
- package.json / pyproject.toml / Cargo.toml
- 主要ファイル・エントリポイント
- 依存関係

### 2. README生成
- プロジェクト名・説明
- インストール方法
- 使い方
- ディレクトリ構造
- ライセンス

### 3. 保存
- 既存README.mdのバックアップ
- 新しいREADME.mdを作成

## READMEテンプレート

```markdown
# プロジェクト名

簡潔な説明（1-2文）

## 機能

- 機能1
- 機能2

## インストール

\`\`\`bash
# コマンド
\`\`\`

## 使い方

\`\`\`bash
# 基本的な使い方
\`\`\`

## ディレクトリ構造

\`\`\`
project/
├── src/
└── ...
\`\`\`

## 開発

\`\`\`bash
# 開発サーバー起動
bun run dev

# ビルド
bun run build

# テスト
bun test
\`\`\`

## ライセンス

MIT
```

## 検出項目

| ファイル | 抽出情報 |
|---------|---------|
| package.json | name, description, scripts |
| pyproject.toml | name, description |
| Cargo.toml | name, description |
| .gitignore | 除外パターン |

## オプション

- `--minimal`: 最小限のREADME
- `--full`: 詳細なREADME（API仕様含む）
- `--ja`: 日本語で生成
- `--en`: 英語で生成

$ARGUMENTS でプロジェクトパスを指定。
