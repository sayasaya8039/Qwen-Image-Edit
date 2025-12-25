#!/bin/bash
# Qwen-Image-Edit Local Launcher (Linux/Mac)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "  Qwen-Image-Edit Local Launcher"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "python/server.py" ] && [ ! -f "python/requirements.txt" ]; then
    echo -e "${RED}[ERROR] This script must be run from the project root directory!${NC}"
    echo ""
    echo "Current directory: $(pwd)"
    echo ""
    echo "Please either:"
    echo "  1. Clone the repository first:"
    echo "     git clone https://github.com/your-repo/Qwen-Image-Edit-2511.git"
    echo "     cd Qwen-Image-Edit-2511"
    echo ""
    echo "  2. Or download and extract the project, then run this script from there."
    exit 1
fi

echo -e "${GREEN}[OK] Project directory detected${NC}"
echo ""

show_menu() {
    echo "Select server to start:"
    echo ""
    echo "  ${GREEN}[1]${NC} Qwen-Image-Edit (Main)     - Port 8000"
    echo "  ${GREEN}[2]${NC} BAGEL-7B-MoT               - Port 3002"
    echo "  ${GREEN}[3]${NC} Z-Image-Turbo              - Port 3003"
    echo "  ${GREEN}[4]${NC} Real-ESRGAN (Upscale)      - Port 3004"
    echo "  ${GREEN}[5]${NC} FLUX.2 [dev]               - Port 3005"
    echo "  ${BLUE}[6]${NC} Frontend + API Server"
    echo "  ${YELLOW}[7]${NC} Start All (Background)"
    echo "  ${YELLOW}[8]${NC} Install Dependencies"
    echo "  ${RED}[0]${NC} Exit"
    echo ""
}

activate_venv() {
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    fi
}

install_deps() {
    echo ""
    echo "Installing dependencies..."
    echo ""
    echo "[1/3] Installing Node.js packages..."
    npm install
    echo ""
    echo "[2/3] Creating Python virtual environment..."
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    echo ""
    echo "[3/3] Installing Python packages..."
    pip install -r python/requirements.txt
    echo ""
    echo -e "${GREEN}[OK] Installation complete!${NC}"
    echo ""
}

start_qwen() {
    echo -e "${GREEN}Starting Qwen-Image-Edit server...${NC}"
    activate_venv
    python python/server.py --port 8000
}

start_bagel() {
    echo -e "${GREEN}Starting BAGEL server...${NC}"
    activate_venv
    python python/bagel_server.py --port 3002
}

start_zimage() {
    echo -e "${GREEN}Starting Z-Image-Turbo server...${NC}"
    activate_venv
    python python/zimage_server.py --port 3003
}

start_upscale() {
    echo -e "${GREEN}Starting Upscale server...${NC}"
    activate_venv
    python python/upscale_server.py --port 3004
}

start_flux2() {
    echo -e "${GREEN}Starting FLUX.2 server...${NC}"
    activate_venv
    python python/flux2_server.py --port 3005
}

start_frontend() {
    echo -e "${GREEN}Starting Frontend + API server...${NC}"
    npm run server &
    sleep 2
    npm run dev &
    echo ""
    echo "----------------------------------------"
    echo "  Frontend: http://localhost:5173"
    echo "  API: http://localhost:3001"
    echo "----------------------------------------"
}

start_all() {
    echo -e "${YELLOW}Starting all servers in background...${NC}"
    activate_venv

    python python/server.py --port 8000 &
    echo "  [+] Qwen-Image-Edit started (port 8000)"

    npm run server &
    echo "  [+] API server started (port 3001)"

    sleep 2

    npm run dev &
    echo "  [+] Frontend started (port 5173)"

    echo ""
    echo "----------------------------------------"
    echo -e "  ${GREEN}All servers started!${NC}"
    echo "  Frontend: http://localhost:5173"
    echo "----------------------------------------"
    echo ""
    echo "Press Ctrl+C to stop all servers"
    wait
}

# Main loop
while true; do
    show_menu
    read -p "Choice (0-8): " choice

    case $choice in
        1) start_qwen ;;
        2) start_bagel ;;
        3) start_zimage ;;
        4) start_upscale ;;
        5) start_flux2 ;;
        6) start_frontend ;;
        7) start_all ;;
        8) install_deps ;;
        0) echo "Goodbye!"; exit 0 ;;
        *) echo -e "${RED}Invalid selection${NC}"; echo "" ;;
    esac
done
