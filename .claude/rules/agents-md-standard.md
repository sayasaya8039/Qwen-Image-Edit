---
paths: "**/AGENTS.md, **/agents.md, **/.github/**"
---

# AGENTS.md 標準規格（必須）

## 概要

**AGENTS.md**はAIコーディングエージェント向けの設定ファイル標準。
Linux Foundation傘下のAgentic AI Foundationが管理。

## 重要性

| 対応ツール |
|-----------|
| Claude Code |
| GitHub Copilot |
| Cursor |
| OpenCode |
| Gemini CLI |
| Windsurf |
| Replit |

## CLAUDE.mdとの関係

| ファイル | 用途 |
|----------|------|
| `CLAUDE.md` | Claude Code専用設定 |
| `AGENTS.md` | 全AIエージェント共通設定 |

**両方を配置することで最大の互換性を確保。**

## 基本構成

```markdown
# AGENTS.md

## Build Commands
bun install
bun run build
bun run test

## Code Style
- TypeScript strict mode
- Biome for formatting
- No any types

## Architecture
- src/: Source code
- tests/: Test files

## Do Not Touch
- .env files
- node_modules/
- dist/
```

## ベストプラクティス

### 1. コマンドを先頭に
ビルド・テストコマンドをファイル先頭に配置。

### 2. コード例を含める
説明より実際のコードスニペットが効果的。

### 3. 境界を明確に
触れてはいけないファイル・ディレクトリを明記。

### 4. サブディレクトリ対応
```
project/
├── AGENTS.md           # ルート設定
├── frontend/
│   └── AGENTS.md       # フロントエンド固有
└── backend/
    └── AGENTS.md       # バックエンド固有
```

## 必須ルール

| ルール | 内容 |
|--------|------|
| **両方配置** | CLAUDE.mdとAGENTS.md両方を配置 |
| **コマンド優先** | ビルド・テストコマンドを先頭に |
| **禁止領域明記** | 触れてはいけないファイルを明記 |

## 参照

- [公式サイト](https://agents.md)
- [GitHub](https://github.com/agentsmd/agents.md)
- [GitHubブログ](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
