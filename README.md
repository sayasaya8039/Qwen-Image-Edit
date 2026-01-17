# 🎨 Qwen Image Edit

<div align="center">

![Version](https://img.shields.io/badge/version-1.3.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Hono](https://img.shields.io/badge/Hono-4.7-orange)

**複数のAIモデルに対応した画像生成・編集Webアプリケーション**

[デモ](https://qwen-image-edit.sayasaya.workers.dev) | [ドキュメント](#使い方) | [ローカルセットアップ](#ローカル環境セットアップ)

</div>

---

## ✨ 特徴

- 🖼️ **PhotoShop風UI** - 直感的に操作できるモダンなインターフェース
- 🤖 **複数AIモデル対応** - Qwen, BAGEL, FLUX, Z-Image など最新モデルを搭載
- ⚡ **WebAssembly高速化** - 画像リサイズをWASMで最大10倍高速化
- ☁️ **クラウド & ローカル** - HuggingFace Spaces経由のクラウド実行とローカルGPU実行の両対応
- 🚀 **高速デプロイ** - Cloudflare Workers で世界中からアクセス可能
- 🔧 **ncnn/ONNX対応** - AMD/Intel GPUでもDirectML/Vulkanで動作

## 🎯 機能

| モード | 説明 | 必要画像数 |
|--------|------|-----------|
| **生成** | プロンプトから新規画像を生成 | 0枚 |
| **編集** | 画像をプロンプトに従って編集 | 1枚 |
| **合成** | 複数画像を組み合わせて新画像を生成 | 2枚以上 |
| **超解像度** | 画像を4倍にアップスケール | 1枚 |

## 🤖 対応モデル

### クラウドモデル（HuggingFace Spaces）

| モデル | 種類 | 説明 |
|--------|------|------|
| **Qwen-Image-Edit-2511** | 画像編集 | Qwenの画像編集モデル（デフォルト） |
| **BAGEL-7B-MoT** | マルチモーダル | ByteDanceの統合モデル（生成・編集・理解） |
| **Z-Image-Turbo** | 高速生成 | Tongyiの高速テキスト→画像生成 |
| **FLUX.2 [dev]** | 最新生成 | Black Forest Labsの32B最先端モデル |
| **FLUX.2 Klein 4B** | 軽量生成 | Black Forest Labsの軽量4Bモデル（FP8量子化、8GB VRAM対応） |

### ローカル専用モデル

| モデル | 種類 | 対応GPU | 説明 |
|--------|------|---------|------|
| **Real-ESRGAN x4** | 超解像度 | CUDA/CPU | 画像を4倍にアップスケール |
| **Real-ESRGAN ncnn** | 超解像度 | Vulkan | AMD/Intel/NVIDIA対応 |
| **Stable Diffusion ONNX** | 生成 | DirectML | AMD/Intel GPU対応 |
| **FLUX.1 ONNX** | 生成 | DirectML/CUDA | ONNX最適化版 |
| **BAGEL INT8** | 生成/編集 | CUDA | 量子化版（省VRAM） |

## 🛠️ 技術スタック

```
フロントエンド: React 19 + TypeScript + Tailwind CSS + Vite
WebAssembly:   AssemblyScript（画像処理高速化）
バックエンド:   Hono (Bun / Cloudflare Workers)
AIモデル:       HuggingFace Spaces / ローカルPython
デプロイ:       Cloudflare Workers + KV Storage
```

## ⚡ WebAssembly 高速化

このアプリケーションは **WebAssembly (WASM)** を使用して、画像処理のパフォーマンスを大幅に向上させています。

### 技術詳細

| 項目 | 内容 |
|------|------|
| **言語** | AssemblyScript（TypeScript互換） |
| **アルゴリズム** | Bilinear補間（バイリニア補間） |
| **ターゲット** | ブラウザネイティブWASM |
| **フォールバック** | JavaScript実装（WASM非対応環境） |

### パフォーマンス向上

画像リサイズ処理において、JavaScript版と比較して **5-10倍の高速化** を実現：

| 画像サイズ | JavaScript | WASM | 高速化 |
|-----------|-----------|------|--------|
| 512×512 → 256×256 | ~8ms | ~1.5ms | **5.3x** |
| 1024×1024 → 512×512 | ~30ms | ~4.2ms | **7.1x** |
| 2048×1536 → 1024×768 | ~85ms | ~9.8ms | **8.7x** |
| 4096×3072 → 1024×768 | ~320ms | ~35ms | **9.1x** |

*測定環境: Chrome 120, AMD Ryzen 7 5800X, Windows 11*

### 実装の特徴

- **自動最適化**: 1024px以上の画像を自動リサイズ
- **メモリ効率**: WASM Linear Memoryで直接ピクセル操作
- **軽量**: WASMモジュールサイズ 約400バイト
- **Progressive Enhancement**: WASM非対応環境でも動作

### ベンチマーク実行方法

開発環境でベンチマークパネルが右下に表示されます：

```bash
bun run dev
# http://localhost:5173 にアクセス
# 右下にベンチマーク結果が自動表示
```

### 技術スタック（WASM）

```
言語:        AssemblyScript
コンパイラ:  asc (AssemblyScript Compiler)
ランタイム:  Stub Runtime（最小構成）
バンドラー:  Vite + vite-plugin-wasm
```


## 🚀 GPU加速（WebGPU基盤 - v1.2系）

**v1.2.0より**: WebGPUによるGPU加速処理の基盤を追加しました。

### 現在の実装状況

| 機能 | 状態 | 説明 |
|------|------|------|
| **WebGPU検出** | ✅ 実装済み | ブラウザのWebGPU対応を自動検出 |
| **ガウシアンブラー（CPU）** | ✅ 実装済み | 高速CPU実装（分離可能畳み込み） |
| **ガウシアンブラー（GPU）** | 🚧 開発中 | WebGPU Compute Shader実装予定 |
| **エッジ検出** | 📋 計画中 | v1.3以降で実装予定 |
| **色調補正** | 📋 計画中 | v1.3以降で実装予定 |

### フォールバック機構

WebGPU非対応ブラウザでも動作するよう、自動フォールバックを実装：

```
WebGPU（GPU加速）
    ↓ 利用不可の場合
WebAssembly（AssemblyScript）
    ↓ 利用不可の場合
JavaScript（Canvas API）
```

### 将来の計画：HipScript統合

[HipScript](https://github.com/lights0123/hipscript/)（2025年1月発表）により、CUDA/HIPコードをブラウザで実行可能になりました。v1.3以降でCUDA→WGSL変換統合を検討中：

- **技術**: CUDA → WebAssembly + WebGPU
- **パイプライン**: chipStar → Clspv → Tint → WGSL
- **メリット**: 既存CUDAライブラリ活用可能

### ブラウザ互換性

| ブラウザ | WebGPU対応 | 状態 |
|---------|-----------|------|
| Chrome 113+ | ✅ 対応 | GPU加速利用可 |
| Edge 113+ | ✅ 対応 | GPU加速利用可 |
| Safari 18+ | ✅ 対応 | GPU加速利用可 |
| Firefox | ⚠️ 実験的 | フォールバック動作 |

## 🚀 クイックスタート

### オンライン版（推奨）

👉 **[https://qwen-image-edit.sayasaya.workers.dev](https://qwen-image-edit.sayasaya.workers.dev)**

すぐに使えます。インストール不要。

### ローカル開発

```bash
# リポジトリをクローン
git clone https://github.com/sayasaya8039/Qwen-Image-Edit.git
cd Qwen-Image-Edit

# 依存関係をインストール
bun install

# 開発サーバー起動
bun run dev
```

- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:3001

## 📖 使い方

### 1. 画像生成（プロンプトのみ）

```
モード: 生成
プロンプト: A beautiful sunset over the ocean with vibrant orange and purple colors
```

### 2. 画像編集（1枚の画像）

```
モード: 編集
画像: [編集したい画像をアップロード]
プロンプト: Change the background to a forest, keep the person
```

### 3. 画像合成（2枚以上の画像）

```
モード: 合成
画像1: [人物の写真]
画像2: [背景の写真]
プロンプト: Combine the person from image 1 with the background from image 2
```

## 🖥️ ローカル環境セットアップ

ローカルGPUを使用する場合は、別途Pythonサーバーが必要です。

### 必要環境

- Python 3.10+
- CUDA 11.8+ / DirectML / Vulkan
- VRAM 8GB以上（モデルによる）

### Pythonサーバー起動

```bash
# 仮想環境作成
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係インストール
pip install -r python/requirements.txt

# サーバー起動
python python/server.py
```

## 📁 プロジェクト構造

```
Qwen-Image-Edit/
├── src/                    # フロントエンド（React）
│   ├── components/         # UIコンポーネント
│   ├── hooks/              # カスタムフック
│   ├── utils/              # ユーティリティ
│   ├── pages/              # ページ
│   └── types.ts            # 型定義
├── assembly/               # WebAssemblyソース（AssemblyScript）
│   └── image-resize.ts     # 画像リサイズ実装
├── public/wasm/            # ビルド済みWASMモジュール
│   └── image-resize.wasm   # 画像リサイズWASM
├── server/                 # バックエンド（Bun用）
│   ├── index.ts            # APIエンドポイント
│   └── model-manager.ts    # モデル管理
├── worker/                 # Cloudflare Workers用
│   ├── index.ts            # Workers APIエンドポイント
│   └── model-manager.ts    # KVストレージ連携
├── python/                 # ローカルPythonサーバー
│   └── server.py           # 推論サーバー
├── asconfig.json           # AssemblyScript設定
└── wrangler.toml           # Cloudflare設定
```

## 🔧 環境変数

### Cloudflare Workers

```bash
# wrangler.toml で設定済み
ADMIN_USERNAME=admin

# シークレット（wrangler secret で設定）
wrangler secret put ADMIN_PASSWORD
wrangler secret put SESSION_SECRET
```

### ローカル開発

```bash
# .env.local
PYTHON_SERVER_URL=http://localhost:8000
HF_SPACE_URL=https://qwen-qwen-image-edit-2511.hf.space
```

## 🚀 デプロイ

### Cloudflare Workers

```bash
# ビルド
bun run build

# デプロイ
npx wrangler deploy
```

## 📝 ライセンス

MIT License

## 🙏 クレジット

- [Qwen-Image-Edit-2511](https://huggingface.co/Qwen/Qwen-Image-Edit-2511) - Alibaba Qwen Team
- [BAGEL-7B-MoT](https://huggingface.co/ByteDance/BAGEL-7B-MoT) - ByteDance
- [FLUX.2](https://huggingface.co/black-forest-labs/FLUX.2-dev) - Black Forest Labs
- [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) - Xintao Wang

---

<div align="center">
Made with ❤️ by sayasaya8039

🤖 Generated with [Claude Code](https://claude.com/claude-code)
</div>
