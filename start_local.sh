#!/bin/bash
# Qwen-Image-Edit Local Launcher (Linux/Mac)

set -e
cd "$(dirname "$0")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================"
echo "  Qwen-Image-Edit ローカル起動"
echo "========================================"
echo ""

show_menu() {
    echo "起動するサーバーを選択してください:"
    echo ""
    echo "  ${GREEN}[1]${NC} Qwen-Image-Edit (メイン) - ポート 8000"
    echo "  ${GREEN}[2]${NC} BAGEL-7B-MoT           - ポート 3002"
    echo "  ${GREEN}[3]${NC} Z-Image-Turbo          - ポート 3003"
    echo "  ${GREEN}[4]${NC} Real-ESRGAN (超解像度)  - ポート 3004"
    echo "  ${GREEN}[5]${NC} FLUX.2 [dev]           - ポート 3005"
    echo "  ${BLUE}[6]${NC} フロントエンド + APIサーバー"
    echo "  ${YELLOW}[7]${NC} 全て起動 (バックグラウンド)"
    echo "  ${RED}[0]${NC} 終了"
    echo ""
}

start_qwen() {
    echo "${GREEN}Starting Qwen-Image-Edit server...${NC}"
    python python/server.py --port 8000
}

start_bagel() {
    echo "${GREEN}Starting BAGEL server...${NC}"
    python python/bagel_server.py --port 3002
}

start_zimage() {
    echo "${GREEN}Starting Z-Image-Turbo server...${NC}"
    python python/zimage_server.py --port 3003
}

start_upscale() {
    echo "${GREEN}Starting Upscale server...${NC}"
    python python/upscale_server.py --port 3004
}

start_flux2() {
    echo "${GREEN}Starting FLUX.2 server...${NC}"
    python python/flux2_server.py --port 3005
}

start_frontend() {
    echo "${GREEN}Starting Frontend + API server...${NC}"
    bun run server/index.ts &
    sleep 2
    npm run dev &
    echo ""
    echo "----------------------------------------"
    echo "  フロントエンド: http://localhost:5173"
    echo "  API: http://localhost:3001"
    echo "----------------------------------------"
}

start_all() {
    echo "${YELLOW}Starting all servers in background...${NC}"

    # Start Python servers in background
    python python/server.py --port 8000 &
    echo "  [+] Qwen-Image-Edit started (port 8000)"

    # Start Bun server
    bun run server/index.ts &
    echo "  [+] API server started (port 3001)"

    sleep 2

    # Start frontend
    npm run dev &
    echo "  [+] Frontend started (port 5173)"

    echo ""
    echo "----------------------------------------"
    echo "  ${GREEN}全サーバー起動完了！${NC}"
    echo "  フロントエンド: http://localhost:5173"
    echo "----------------------------------------"
    echo ""
    echo "Press Ctrl+C to stop all servers"

    # Wait for any process to exit
    wait
}

# Main loop
while true; do
    show_menu
    read -p "選択 (0-7): " choice

    case $choice in
        1) start_qwen ;;
        2) start_bagel ;;
        3) start_zimage ;;
        4) start_upscale ;;
        5) start_flux2 ;;
        6) start_frontend ;;
        7) start_all ;;
        0) echo "Goodbye!"; exit 0 ;;
        *) echo "${RED}無効な選択です${NC}"; echo "" ;;
    esac
done
