---
paths: "**/exo/**, **/cluster/**, **/distributed/**"
---

# Exo - 分散AIクラスタフレームワーク

## 概要

**Exo**は日常デバイスを活用した分散AIクラスタフレームワーク（38,000+ stars）。
スマートフォン、PC、スマートウォッチなどを接続し、大規模LLMを分散実行。

## 特徴

| 特徴 | 説明 |
|------|------|
| **自動ネットワーク** | デバイス自動検出・接続 |
| **スマート分散** | トポロジー解析・最適シャーディング |
| **RDMA対応** | Thunderbolt 5でレイテンシ99%削減 |
| **MLX基盤** | 高効率な推論・通信 |

## パフォーマンス

| 構成 | 高速化 |
|------|--------|
| 2デバイス | 1.8x |
| 4デバイス | 3.2x |

## インストール

### macOS

```bash
# 依存関係
brew install uv macmon node

# クローン・ビルド
git clone https://github.com/exo-explore/exo
cd exo/dashboard && npm install && npm run build && cd ..

# 起動
uv run exo
```

### Linux (Ubuntu/Debian)

```bash
# システムパッケージ
sudo apt install python3-pip python3-venv nodejs npm

# Rust（オプション）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# クローン・ビルド
git clone https://github.com/exo-explore/exo
cd exo/dashboard && npm install && npm run build && cd ..

# 起動（CPU実行、GPU開発中）
uv run exo
```

### RDMA有効化（Thunderbolt 5搭載Mac）

```bash
# Recoveryモードで実行
rdma_ctl enable
```

## 使用方法

### ダッシュボード

```
http://localhost:52415
```

### API（OpenAI互換）

```bash
# チャット完了
curl http://localhost:52415/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-70b",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Python SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:52415/v1",
    api_key="not-needed"
)

response = client.chat.completions.create(
    model="llama-3.1-70b",
    messages=[{"role": "user", "content": "Hello"}]
)
```

## クラスタ構成例

```
MacBook Pro (M3 Max) ─┬─ iPhone 15 Pro
                      ├─ iPad Pro
                      └─ Mac Mini (M2)
```

## 対応モデル

| モデル | 推奨クラスタサイズ |
|--------|-------------------|
| Llama 3.1 8B | 1-2デバイス |
| Llama 3.1 70B | 3-4デバイス |
| Llama 3.1 405B | 6+デバイス |

## Claude Code連携

```bash
# Exoクラスタ経由でローカルLLM使用
/model exo,llama-3.1-70b

# CCR設定でExoを追加
ccr provider add exo http://localhost:52415/v1
```

## リポジトリ

- GitHub: https://github.com/exo-explore/exo
- ライセンス: Apache 2.0
