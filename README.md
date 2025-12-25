# Qwen Image Edit

Qwen-Image-Edit-2511モデルを使用したAI画像編集Webアプリケーション。PhotoShop風のUIで直感的に操作できます。

## 機能

- **画像生成**: プロンプトから新規画像を生成
- **画像編集**: 1枚の画像をプロンプトに従って編集
- **画像合成**: 2枚の画像を組み合わせて新しい画像を生成
- **超解像度**: Real-ESRGANによる4倍アップスケール
- **保存**: PNG/JPEG形式で保存

## 対応AIモデル

| モデル | 機能 | バックエンド |
|--------|------|-------------|
| **Qwen-Image-Edit-2511** | 画像生成・編集・合成 | CUDA / Cloud |
| **BAGEL-7B-MoT** | 統合マルチモーダル（生成・編集・理解） | CUDA / Cloud |
| **Z-Image-Turbo** | 高速テキストから画像生成 | CUDA / Cloud |
| **FLUX.2 [dev]** | 32B最先端画像生成・編集 | CUDA / Cloud |
| **Real-ESRGAN** | 超解像度（4倍アップスケール） | CUDA / CPU |
| **Stable Diffusion 1.5** | 画像生成（DirectML対応） | DirectML / CUDA / CPU |

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Tailwind CSS + Vite
- **バックエンド**: Hono + Bun / Cloudflare Workers
- **AIモデル**: HuggingFace Spaces / ローカルGPU

## クイックスタート

### クラウドモード（推奨）

\`\`\`bash
# 依存関係インストール
bun install

# 開発サーバー起動（フロント + バック同時）
bun run dev

# または個別に起動
bun run dev:client  # フロントエンド: http://localhost:5173
bun run dev:server  # バックエンド: http://localhost:3001
\`\`\`

### ローカルGPUモード

ローカルGPUでAIモデルを実行する場合は、[ローカル環境セットアップガイド](docs/LOCAL_SETUP.md)を参照してください。

#### Windows

\`\`\`batch
start_local.bat
\`\`\`

#### Linux / Mac

\`\`\`bash
chmod +x start_local.sh
./start_local.sh
\`\`\`

## 使い方

1. **画像なし（生成モード）**: プロンプトを入力して「生成する」をクリック
2. **画像1枚（編集モード）**: 画像をアップロードし、編集内容をプロンプトで指定
3. **画像2枚（合成モード）**: 2枚の画像をアップロードし、合成方法をプロンプトで指定

## デプロイ

### Cloudflare Workers

\`\`\`bash
npm run deploy
\`\`\`

### 本番ビルド

\`\`\`bash
bun run build
\`\`\`

## VRAM要件（ローカルモード）

| モデル | 最小VRAM | 推奨VRAM |
|--------|----------|----------|
| Qwen-Image-Edit | 8GB | 12GB |
| BAGEL-7B-MoT | 12GB | 24GB |
| Z-Image-Turbo | 16GB | 24GB |
| FLUX.2 [dev] | 16GB | 48GB |
| Real-ESRGAN | 4GB | 8GB |

## ドキュメント

- [ローカル環境セットアップガイド](docs/LOCAL_SETUP.md)

## ライセンス

MIT
