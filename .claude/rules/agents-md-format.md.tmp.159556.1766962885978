---
paths: "**/AGENTS.md, **/agents.md"
---

# AGENTS.md - AIコーディングエージェント向け標準フォーマット

## 概要

**AGENTS.md**はAIコーディングエージェント向けのオープン標準フォーマット（13,000+ stars）。
60,000以上のOSSプロジェクトで採用。Linux Foundation傘下のAgentic AI Foundationが管理。

## 目的

| ファイル | 対象 | 内容 |
|---------|------|------|
| README.md | 人間 | クイックスタート、説明、貢献ガイド |
| **AGENTS.md** | AIエージェント | ビルド手順、テスト、コーディング規約 |

## 対応ツール

| ツール | サポート状況 |
|--------|-------------|
| Claude Code | ✅ シンボリックリンク経由 |
| GitHub Copilot | ✅ ネイティブ対応 |
| OpenAI Codex | ✅ ネイティブ対応 |
| OpenCode | ✅ ネイティブ対応 |
| Cursor | ✅ シンボリックリンク経由 |
| Amp | ✅ ネイティブ対応 |
| Gemini CLI | ✅ シンボリックリンク経由 |

## ファイル配置

```
project/
├── AGENTS.md              # ルートレベル（プロジェクト全体）
├── src/
│   └── AGENTS.md          # サブディレクトリ（src固有の指示）
└── tests/
    └── AGENTS.md          # サブディレクトリ（テスト固有の指示）
```

**エージェントは最も近いAGENTS.mdを参照**（.gitignoreと同様の動作）

## 書き方のベストプラクティス

### 1. コマンドを早めに記載

```markdown
## ビルド・テスト

\`\`\`bash
bun install
bun run build
bun test
bun run lint
\`\`\`
```

### 2. コード例で規約を示す

```markdown
## コーディング規約

関数は以下のスタイルで記述：

\`\`\`typescript
// ✅ 良い例
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// ❌ 悪い例
function calc(i) {
  let s = 0
  for (let x of i) s += x.price
  return s
}
\`\`\`
```

### 3. 境界を明確に設定

```markdown
## 禁止事項

- `.env` ファイルの編集禁止
- `vendor/` ディレクトリは触らない
- 本番設定ファイルの変更禁止
- シークレットのコミット禁止
```

### 4. スタックを具体的に記載

```markdown
## 技術スタック

- **言語**: TypeScript 5.3+
- **ランタイム**: Bun 1.3+
- **フレームワーク**: React 19, Hono
- **スタイル**: Tailwind CSS 4.0
- **テスト**: Vitest
- **Linter**: Biome
```

## AGENTS.mdテンプレート

```markdown
# AGENTS.md

## プロジェクト概要

[プロジェクトの簡潔な説明]

## ビルド・テスト

\`\`\`bash
bun install
bun run build
bun test
\`\`\`

## 技術スタック

- TypeScript 5.3+
- Bun 1.3+
- React 19

## コーディング規約

- 関数はアロー関数を使用
- 型は明示的に記述
- `any`型は禁止

## ディレクトリ構造

\`\`\`
src/
├── components/  # UIコンポーネント
├── lib/         # ユーティリティ
├── routes/      # ルーティング
└── types/       # 型定義
\`\`\`

## 禁止事項

- シークレットのコミット禁止
- `dist/`への直接編集禁止
- テストなしでのPR禁止
```

## Claude Codeでの活用

```bash
# AGENTS.mdを作成
/doc agents

# 既存プロジェクトにAGENTS.mdを追加
/init agents

# CLAUDE.mdとAGENTS.mdの併用（推奨）
# CLAUDE.md: Claude Code固有の設定
# AGENTS.md: 汎用エージェント向け情報
```

## リンク

- 公式サイト: https://agents.md
- GitHub: https://github.com/agentsmd/agents.md
- OpenAI ガイド: https://developers.openai.com/codex/guides/agents-md/
