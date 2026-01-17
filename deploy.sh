#!/bin/bash
set -e

echo "=== Qwen-Image-Edit-2511 Cloudflare Pages Deploy Script ==="
echo ""

# Cloudflare認証確認
echo "Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo ""
    echo "You need to login to Cloudflare first."
    echo "Please run: wrangler login"
    exit 1
fi

# ビルド実行
echo "Building project..."
bun install
bun run build

# デプロイ
echo ""
echo "Deploying to Cloudflare Pages..."
wrangler pages deploy dist --project-name=qwen-image-edit

echo ""
echo "=== Deploy Complete ==="
echo ""
echo "Your app is live at: https://qwen-image-edit.pages.dev"
echo ""
