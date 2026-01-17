---
description: 新規プロジェクトを初期化
allowed-tools: Bash(bun:*), Bash(bunx:*), Bash(npm:*), Bash(npx:*), Bash(git:*), Bash(mkdir:*), Write, Read
argument-hint: [タイプ] [--name 名前]
---

新しいプロジェクトを素早く初期化します。

## 対応するプロジェクトタイプ

| タイプ | コマンド | 説明 |
|--------|----------|------|
| **web-react** | `/init web-react` | Vite + React + TypeScript |
| **web-vue** | `/init web-vue` | Vite + Vue + TypeScript |
| **hono** | `/init hono` | Hono + Cloudflare Workers |
| **extension** | `/init extension` | Chrome拡張機能 |
| **electron** | `/init electron` | Electron デスクトップアプリ |
| **python** | `/init python` | Python プロジェクト |

## 実行内容

1. **プロジェクト作成**
   - 適切なテンプレートを選択
   - プロジェクト名を設定

2. **初期設定**
   - TypeScript/Python設定
   - ESLint/Prettier/Ruff設定
   - Git初期化

3. **基本ファイル作成**
   - README.md
   - .gitignore
   - 環境変数テンプレート

4. **開発環境準備**
   - 依存関係インストール
   - 最初のビルド確認

## オプション

```
--name <name>     プロジェクト名
--dir <path>      作成先ディレクトリ
--no-git          Git初期化をスキップ
--no-install      依存関係インストールをスキップ
--tailwind        Tailwind CSSを追加
--router          ルーターを追加
```

## 使用例

```bash
# React Webアプリ
/init web-react --name my-dashboard

# Hono API
/init hono --name my-api

# Chrome拡張
/init extension --name my-extension

# Python
/init python --name my-tool
```

$ARGUMENTS からタイプとオプションを解析して実行。
