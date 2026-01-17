# Qwen Image Edit プロジェクト情報

## 概要

複数AIモデル対応の画像生成・編集Webアプリケーション

## 機能

| モード | 説明 |
|--------|------|
| 生成 | プロンプトから新規画像生成 |
| 編集 | 画像をプロンプトで編集 |
| 合成 | 複数画像を組み合わせ |
| 超解像度 | 4倍アップスケール |

## 対応モデル

- Qwen-Image-Edit-2511（デフォルト）
- BAGEL-7B-MoT（ByteDance）
- Z-Image-Turbo（高速生成）
- FLUX.2 [dev]（32B最先端）
- Real-ESRGAN（超解像度）

## 技術スタック

```
Frontend: React 19 + TypeScript + Tailwind CSS + Vite
Backend:  Hono (Bun / Cloudflare Workers)
Deploy:   Cloudflare Workers + KV Storage
```

## ディレクトリ構成

```
D:\Web_app\Qwen-Image-Edit-2511\
├── src/          # フロントエンド（React）
├── server/       # バックエンド（Bun用）
├── worker/       # Cloudflare Workers用
├── python/       # ローカルPythonサーバー
├── public/       # 静的ファイル
└── docs/         # ドキュメント
```

## デプロイURL

https://qwen-image-edit.sayasaya.workers.dev
