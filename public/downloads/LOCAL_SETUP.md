# ローカル環境セットアップガイド

このガイドでは、各AIモデルをローカルGPUで実行する方法を説明します。

## 動作要件

### 共通要件
- Python 3.10以上
- NVIDIA GPU（CUDAサポート）
- CUDA Toolkit 11.8以上

### モデル別VRAM要件

| モデル | 最小VRAM | 推奨VRAM | 量子化 |
|--------|----------|----------|--------|
| Qwen-Image-Edit | 8GB | 12GB | - |
| BAGEL-7B-MoT | 12GB | 24GB | NF4/INT8 |
| Z-Image-Turbo | 16GB | 24GB | - |
| FLUX.2 [dev] | 16GB | 48GB | NF4/INT8/BF16 |
| Real-ESRGAN | 4GB | 8GB | - |

---

## 1. 基本セットアップ

### 1.1 リポジトリのクローン

```bash
git clone https://github.com/your-repo/Qwen-Image-Edit-2511.git
cd Qwen-Image-Edit-2511
```

### 1.2 Python仮想環境の作成

```bash
# condaを使用（推奨）
conda create -n qwen-image python=3.10
conda activate qwen-image

# または venv を使用
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
```

### 1.3 PyTorchのインストール（CUDA対応）

```bash
# CUDA 11.8
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# CUDA 12.1
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

### 1.4 共通依存関係のインストール

```bash
cd python
pip install -r requirements.txt
```

---

## 2. 各モデルのセットアップ

### 2.1 Qwen-Image-Edit-2511（メインモデル）

**ポート: 8000**

```bash
# 依存関係
pip install diffusers transformers accelerate safetensors

# サーバー起動
python python/server.py --port 8000
```

**初回起動時**: モデル（約15GB）が自動ダウンロードされます。

---

### 2.2 BAGEL-7B-MoT

**ポート: 3002**
**要件**: Python 3.10, CUDA, 12GB+ VRAM

```bash
# 専用環境を作成（推奨）
conda create -n bagel python=3.10
conda activate bagel

# PyTorch + CUDA
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# flash-attn（必須、ビルドに時間がかかります）
pip install flash-attn==2.5.8 --no-build-isolation

# BAGEL依存関係
pip install -r python/requirements-bagel.txt

# サーバー起動
python python/bagel_server.py --port 3002
```

**VRAM別の動作モード**:
- 32GB+: フル精度（BF16）
- 22-32GB: INT8量子化
- 12-22GB: NF4量子化

---

### 2.3 Z-Image-Turbo

**ポート: 3003**
**要件**: CUDA, 16GB+ VRAM

```bash
# 最新のdiffusersが必要
pip install git+https://github.com/huggingface/diffusers

# サーバー起動
python python/zimage_server.py --port 3003
```

**特徴**: 8ステップで高速生成（サブ秒レイテンシ）

---

### 2.4 FLUX.2 [dev]

**ポート: 3005**
**要件**: CUDA, 16GB+ VRAM（4bit量子化使用時）

```bash
# 依存関係
pip install git+https://github.com/huggingface/diffusers
pip install bitsandbytes  # 量子化用

# サーバー起動
python python/flux2_server.py --port 3005
```

**VRAM別の動作モード**:
- 48GB+: フル精度（BF16）
- 24-48GB: INT8量子化
- 16-24GB: NF4量子化 + リモートテキストエンコーダー

---

### 2.5 Real-ESRGAN（超解像度）

**ポート: 3004**
**要件**: CUDA または CPU

```bash
# 依存関係
pip install realesrgan basicsr gfpgan

# サーバー起動
python python/upscale_server.py --port 3004
```

**機能**: 画像を4倍にアップスケール

---

## 3. フロントエンド + バックエンドの起動

### 3.1 全サービスを起動

```bash
# ターミナル1: フロントエンド開発サーバー
npm run dev

# ターミナル2: Bunサーバー（APIプロキシ）
bun run server/index.ts

# ターミナル3: 使用したいPythonサーバー
python python/server.py --port 8000           # Qwen
python python/bagel_server.py --port 3002     # BAGEL
python python/zimage_server.py --port 3003    # Z-Image
python python/flux2_server.py --port 3005     # FLUX.2
python python/upscale_server.py --port 3004   # 超解像度
```

### 3.2 アクセス

- **フロントエンド**: http://localhost:5173
- **API**: http://localhost:3001

---

## 4. 環境変数の設定（オプション）

`.env` ファイルを作成してカスタマイズ：

```env
# Python サーバーURL
PYTHON_SERVER_URL=http://localhost:8000

# 各モデルサーバーURL
BAGEL_LOCAL_URL=http://localhost:3002
ZIMAGE_LOCAL_URL=http://localhost:3003
UPSCALE_LOCAL_URL=http://localhost:3004
FLUX2_LOCAL_URL=http://localhost:3005

# HuggingFace Token（プライベートモデル用）
HF_TOKEN=hf_xxxxxxxxxxxx
```

---

## 5. トラブルシューティング

### CUDA out of memory エラー

```bash
# 環境変数で使用GPUを制限
export CUDA_VISIBLE_DEVICES=0

# PyTorchのメモリ割り当てを調整
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
```

### flash-attn のインストールに失敗

```bash
# 事前ビルド版を使用
pip install flash-attn --no-build-isolation

# または、flash-attnなしで実行（一部機能制限あり）
```

### モデルダウンロードが遅い

```bash
# HuggingFace ミラーを使用（中国など）
export HF_ENDPOINT=https://hf-mirror.com
```

---

## 6. 一括起動スクリプト

### Windows (start_local.bat)

```batch
@echo off
start "Qwen Server" cmd /k "cd /d %~dp0 && python python/server.py"
start "Bun Server" cmd /k "cd /d %~dp0 && bun run server/index.ts"
start "Frontend" cmd /k "cd /d %~dp0 && npm run dev"
echo All servers started!
pause
```

### Linux/Mac (start_local.sh)

```bash
#!/bin/bash
cd "$(dirname "$0")"

# バックグラウンドで起動
python python/server.py &
bun run server/index.ts &
npm run dev &

echo "All servers started!"
echo "Frontend: http://localhost:5173"
```

---

## 7. 推奨ハードウェア構成

### エントリー（8-12GB VRAM）
- GPU: RTX 3060 12GB / RTX 4060 Ti 16GB
- 対応モデル: Qwen-Image-Edit, Real-ESRGAN

### ミドル（16-24GB VRAM）
- GPU: RTX 3090 / RTX 4080 / RTX 4090
- 対応モデル: 全モデル（量子化使用）

### ハイエンド（48GB+ VRAM）
- GPU: RTX A6000 / H100
- 対応モデル: 全モデル（フル精度）

---

## 8. よくある質問

**Q: クラウドとローカルを切り替えられますか？**
A: はい。ローカルサーバーが起動していれば自動的にローカルを使用し、起動していなければクラウドにフォールバックします。

**Q: 複数のモデルを同時に使えますか？**
A: VRAMに余裕があれば可能です。ただし、各モデルは別々のポートで起動する必要があります。

**Q: AMD GPUでも動きますか？**
A: DirectML対応モデル（Stable Diffusion 1.5）のみ動作します。他のモデルはNVIDIA GPU（CUDA）が必要です。
