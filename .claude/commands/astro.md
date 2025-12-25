---
description: Astro開発支援・コマンドリファレンス
allowed-tools: Bash(bun:*), Bash(bunx:*), Bash(npm:*), Bash(npx:*), Read, Write, Edit, Glob, Grep, mcp__context7__*
argument-hint: [サブコマンド/ファイル]
---

Astro（高速コンテンツサイトフレームワーク）の開発を支援します。

## Astroとは

- **Islands Architecture**: 静的HTML + 必要な部分だけJS
- **Zero JS by default**: デフォルトでJavaScriptなし、超高速
- **UI非依存**: React, Vue, Svelte, Solid, Preact等を混在可能
- **Content Collections**: 型安全なコンテンツ管理
- **SSG/SSR両対応**: 静的生成とサーバーレンダリング

## 対応プラットフォーム

| デプロイ先 | インテグレーション |
|-----------|-------------------|
| Cloudflare | `@astrojs/cloudflare` |
| Vercel | `@astrojs/vercel` |
| Netlify | `@astrojs/netlify` |
| Node.js | `@astrojs/node` |

## クイックリファレンス

### プロジェクト作成
```bash
# 新規プロジェクト
bun create astro@latest

# テンプレート指定
bun create astro@latest -- --template blog
bun create astro@latest -- --template docs
bun create astro@latest -- --template portfolio
```

### 開発コマンド
```bash
# 開発サーバー
bun run dev

# ビルド
bun run build

# プレビュー
bun run preview

# 型チェック
bunx astro check
```

### インテグレーション追加
```bash
# React追加
bunx astro add react

# Tailwind追加
bunx astro add tailwind

# Cloudflareアダプター追加
bunx astro add cloudflare

# MDX追加
bunx astro add mdx

# sitemap追加
bunx astro add sitemap
```

## ファイル構造

```
src/
├── pages/          # ルーティング（.astro, .md, .mdx）
├── components/     # コンポーネント
├── layouts/        # レイアウト
├── content/        # Content Collections
├── styles/         # グローバルスタイル
└── assets/         # 画像等の静的アセット
public/             # そのまま配信される静的ファイル
astro.config.mjs    # Astro設定
```

## Content Collections

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { blog };
```

## Islands（クライアントディレクティブ）

```astro
<!-- デフォルト: サーバーのみ（JSなし） -->
<MyComponent />

<!-- ページ読み込み時にハイドレート -->
<MyComponent client:load />

<!-- ビューポートに入ったらハイドレート -->
<MyComponent client:visible />

<!-- アイドル時にハイドレート -->
<MyComponent client:idle />

<!-- メディアクエリに一致したらハイドレート -->
<MyComponent client:media="(max-width: 768px)" />
```

## Astroを選ぶべき場面

| 用途 | 理由 |
|------|------|
| ブログ | Content Collections + MDX |
| ドキュメント | Starlight（公式テーマ） |
| ポートフォリオ | 軽量 + 高速 |
| LP/マーケティング | SEO最適化 + 高速 |
| Eコマース | Server Islands対応 |

## 実行内容

1. **$ARGUMENTS** の内容に応じて適切なAstro操作を実行
2. context7で最新のAstro APIを確認
3. 必要に応じてインテグレーション追加
4. ビルド・型チェックを実行
