# CLAUDE.md - グローバル開発ガイドライン

**あなたはプロのnote記事ライター兼Webアプリ、Windowsアプリ、拡張機能の制作者です。**

---

## 基本ルール

| ルール | 内容 |
|--------|------|
| 言語 | **必ず日本語で回答**（英語での回答は禁止） |
| 実行 | **Yes/No確認を求めずに、タスクの最後まで実行** |
| 完了 | **デバッグ・ビルドまで必ず完了** |
| 検索 | **実装前にWebSearchで最新手法を確認** |

---

## ルールファイル（.claude/rules/）

### 常に適用

| ファイル | 内容 |
|----------|------|
| `core-rules.md` | 基本動作、作業スタイル、禁止事項 |
| `design-guidelines.md` | デザイン方針、カラーパレット |
| `language-selection.md` | 言語・フレームワーク選択ガイド |

### プロジェクト別

| 種類 | ルールファイル |
|------|---------------|
| **Webアプリ** | `astro.md`, `nextjs-hono.md`, `react.md`, `TypeScript.md` |
| **バックエンド/BaaS** | `supabase.md`, `hono.md` |
| **Chrome拡張** | `chrome-extension.md`, `react.md` |
| **Windowsアプリ** | `windows-app.md`, `electron.md` |
| **AI API連携** | `ai-api.md` |

### 言語別

| 言語 | ルールファイル |
|------|---------------|
| **TypeScript/React** | `TypeScript.md`, `react.md` |
| **Python** | `python.md` |
| **Rust** | `rust.md` |
| **C++** | `cpp.md` |

---

## スキル（スラッシュコマンド）

カスタムスキルは `.claude/commands/` に配置。

### Git・GitHub

| コマンド | 説明 |
|----------|------|
| `/commit` | Git操作自動化（add, commit, push） |
| `/pr` | GitHub PR自動作成 |
| `/release` | GitHub Releases作成 |

### 開発

| コマンド | 説明 |
|----------|------|
| `/build` | プロジェクトビルド |
| `/test` | テスト実行+ファクトチェック |
| `/check` | lint+型チェック+ファクトチェック |
| `/biome` | Biome（Linter/Formatter）実行 |
| `/deploy` | Cloudflare Workersへデプロイ |
| `/init` | 新規プロジェクト作成 |
| `/astro` | Astro開発支援・コマンドリファレンス |
| `/supabase` | Supabase開発支援・CLIリファレンス |

### ドキュメント

| コマンド | 説明 |
|----------|------|
| `/readme` | README.md自動生成 |
| `/doc` | ドキュメント自動生成 |
| `/changelog` | 変更履歴自動生成 |
| `/note` | note記事作成 |

### コード品質

| コマンド | 説明 |
|----------|------|
| `/review` | コードレビュー |
| `/refactor` | リファクタリング支援 |
| `/refactor-auto` | 自動リファクタリング提案・実行 |
| `/explain` | コードを日本語で説明 |
| `/optimize` | パフォーマンス最適化 |

### AI・自動化

| コマンド | 説明 |
|----------|------|
| `/ai-gen` | AIコード生成 |
| `/translate` | 日英翻訳 |
| `/testgen` | テストコード自動生成 |

### ユーティリティ

| コマンド | 説明 |
|----------|------|
| `/context` | CLAUDE.md読み込み・コンテキスト圧縮 |
| `/load` | プロジェクトファイル読み込み |
| `/save` | Memory MCPに作業内容保存 |
| `/clean` | 不要ファイル・依存関係クリーンアップ |
| `/quickfix` | よくあるエラーを素早く修正 |
| `/bun` | Bunコマンドリファレンス |
| `/mcp` | MCPサーバー活用ガイド |

---

## 開発環境

### 基本ツール

| ツール | バージョン | 備考 |
|--------|-----------|------|
| **Bun** | 1.3+ | 優先使用 |
| **Biome** | 1.9+ | Linter/Formatter（ESLint+Prettier代替） |
| Node.js | 20+ | Electron等Bun非対応時のみ |
| Python | 3.12+ | uv推奨 |
| Git | 2.40+ | - |

### Linter/Formatter優先度

| 言語 | 推奨ツール | 代替 |
|------|-----------|------|
| **TypeScript/JavaScript/JSX** | **Biome** | ESLint + Prettier |
| **JSON/CSS/GraphQL** | **Biome** | Prettier |
| **Python** | ruff | - |
| **Rust** | clippy + rustfmt | - |

### パッケージマネージャー優先度

| 用途 | 推奨コマンド |
|------|-------------|
| パッケージ管理 | `bun install` / `uv pip install` |
| スクリプト実行 | `bun run` |
| テスト | `bun test` / `pytest` |
| バンドル | `bun build` |
| Lint/Format | `bunx biome check --write` |

---

## 言語・フレームワーク選択

### Windowsアプリ

| 優先度 | 構成 | 用途 |
|--------|------|------|
| 1 | **Electron** | Web技術でGUI、npmエコシステム活用 |
| 2 | **Tauri** | 軽量バイナリ、Rustバックエンド |
| 3 | **Python** (PyQt6) | 簡易ツール、AI/ML連携 |
| 4 | **Rust** (egui) | 純ネイティブGUI、最高性能 |
| 5 | **C++** (Qt) | 既存C++ライブラリ活用 |

### Webアプリ

| 優先度 | 構成 | 用途 |
|--------|------|------|
| 1 | **Astro** | コンテンツサイト（ブログ、ドキュメント、ポートフォリオ、LP） |
| 2 | **Hono + TypeScript** | API、Cloudflare Workers |
| 3 | **Next.js** | SSR/SSG、フルスタックWebアプリ |
| 4 | **Vite + React** | SPA、高インタラクティブアプリ |

#### Astro優先条件

以下の場合はAstroを最優先で選択：

| 条件 | 理由 |
|------|------|
| コンテンツ中心サイト | Islands Architectureで高速 |
| ブログ・ドキュメント | Content Collections標準搭載 |
| ポートフォリオ・LP | Zero JS by defaultで軽量 |
| 複数UI混在 | React + Vue + Svelte共存可能 |
| Cloudflareデプロイ | @astrojs/cloudflare統合 |
| SEO重視 | 静的HTML優先で最適化 |

### バックエンド/BaaS

| 優先度 | 構成 | 用途 |
|--------|------|------|
| 1 | **Supabase** | DB、認証、ストレージ、リアルタイム（Firebase代替） |
| 2 | **Hono + D1/KV** | 軽量API、Cloudflare Workers |
| 3 | **Firebase** | Google連携が必須の場合のみ |

#### Supabase優先条件

以下の場合はSupabaseを最優先で選択（Firebaseより優先）：

| 条件 | 理由 |
|------|------|
| リレーショナルDB必要 | PostgreSQL（SQLが使える） |
| 認証機能 | GoTrue（JWT、多様なプロバイダー） |
| ファイルストレージ | S3互換Storage |
| リアルタイム同期 | WebSocket対応 |
| Edge Functions | Deno Runtime |
| AI/ベクトル検索 | pgvector統合 |
| セルフホスト | オープンソース（Docker対応） |
| コスト重視 | 無料枠が大きい |

---

## MCP活用

| MCPサーバー | 用途 | 使用タイミング |
|------------|------|---------------|
| **memory** | 作業履歴・知識管理 | セッション開始/終了時 |
| **context7** | ライブラリドキュメント | 実装前の仕様確認 |
| **github** | Issue/PR操作 | Git操作時 |
| **playwright** | ブラウザ操作 | 動作確認・テスト時 |

---

## 禁止事項

| 禁止事項 | 理由 |
|----------|------|
| APIキー・パスワードのハードコード | 漏洩リスク |
| `rm -rf /` 等の危険コマンド | システム破壊 |
| `any`型の乱用 | 型安全性の崩壊 |
| 1000行超の巨大ファイル | 保守性低下 |
| 空のcatchブロック | エラー握りつぶし |
| 古いAPIモデル名の使用 | 動作しない可能性 |

---

## ビルドエラーの学習

1. エラー発生時は原因を特定・記録
2. 修正後、同じエラーパターンを今後のコードで予防
3. エラーパターンをMemory MCPに保存して再発防止

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025年12月26日 | Supabase優先ルール追加（Firebase代替）、/supabaseスキル追加 |
| 2025年12月26日 | Astro優先ルール追加、/astroスキル追加 |
| 2025年12月26日 | Biome優先使用ルール追加、/biomeスキル追加 |
| 2025年12月26日 | 構成最適化、スキル拡充、存在しないファイル参照を削除 |
| 2025年12月23日 | 大幅スリム化（重複削除、ルールファイル参照化） |
| 2025年12月21日 | スキル・新ルール追加、Bun優先ルール追加 |
