@echo off
title Qwen-Image-Edit Local Launcher

echo ========================================
echo   Qwen-Image-Edit Local Launcher
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "python\server.py" (
    if not exist "python\requirements.txt" (
        echo [ERROR] This script must be run from the project root directory!
        echo.
        echo Current directory: %CD%
        echo.
        echo Please either:
        echo   1. Clone the repository first:
        echo      git clone https://github.com/sayasaya8039/Qwen-Image-Edit.git
        echo      cd Qwen-Image-Edit
        echo.
        echo   2. Or download and extract the project, then run this script from there.
        echo.
        echo   3. Or use setup_local.bat for automatic installation.
        echo.
        pause
        exit /b 1
    )
)

echo [OK] Project directory detected
echo.

:: Store current directory
set "PROJECT_DIR=%CD%"

:menu
echo Select server to start:
echo.
echo   [1] Qwen-Image-Edit (Main)     - Port 8000
echo   [2] BAGEL-7B-MoT               - Port 3002
echo   [3] Z-Image-Turbo              - Port 3003
echo   [4] Real-ESRGAN (Upscale)      - Port 3004
echo   [5] FLUX.2 [dev]               - Port 3005
echo   [6] Frontend + API Server
echo   [7] Start All (in new windows)
echo   [8] Install Dependencies
echo   [0] Exit
echo.
set /p choice="Choice (0-8): "

if "%choice%"=="1" goto qwen
if "%choice%"=="2" goto bagel
if "%choice%"=="3" goto zimage
if "%choice%"=="4" goto upscale
if "%choice%"=="5" goto flux2
if "%choice%"=="6" goto frontend
if "%choice%"=="7" goto all
if "%choice%"=="8" goto install
if "%choice%"=="0" goto end
goto menu

:install
echo.
echo Installing dependencies...
echo.
echo [1/3] Installing Node.js packages...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [WARNING] npm install failed, trying with --legacy-peer-deps
    call npm install --legacy-peer-deps
)
echo.
echo [2/3] Creating Python virtual environment...
if not exist "venv" python -m venv venv
call venv\Scripts\activate.bat
echo.
echo [3/3] Installing Python packages (this may take a while)...
pip install -r python/requirements.txt
echo.
echo [OK] Installation complete!
echo.
pause
goto menu

:qwen
echo Starting Qwen-Image-Edit server...
echo (Press Ctrl+C to stop, then type 'exit' to return to menu)
echo.
start "Qwen Server" cmd /k "cd /d %PROJECT_DIR% && call venv\Scripts\activate.bat && python python/server.py --port 8000"
goto menu

:bagel
echo Starting BAGEL server...
start "BAGEL Server" cmd /k "cd /d %PROJECT_DIR% && call venv\Scripts\activate.bat && python python/bagel_server.py --port 3002"
goto menu

:zimage
echo Starting Z-Image-Turbo server...
start "Z-Image Server" cmd /k "cd /d %PROJECT_DIR% && call venv\Scripts\activate.bat && python python/zimage_server.py --port 3003"
goto menu

:upscale
echo Starting Upscale server...
start "Upscale Server" cmd /k "cd /d %PROJECT_DIR% && call venv\Scripts\activate.bat && python python/upscale_server.py --port 3004"
goto menu

:flux2
echo Starting FLUX.2 server...
start "FLUX.2 Server" cmd /k "cd /d %PROJECT_DIR% && call venv\Scripts\activate.bat && python python/flux2_server.py --port 3005"
goto menu

:frontend
echo Starting Frontend + API server...
start "API Server" cmd /k "cd /d %PROJECT_DIR% && npm run server"
timeout /t 2 >nul
start "Frontend" cmd /k "cd /d %PROJECT_DIR% && npm run dev"
echo.
echo ----------------------------------------
echo   Frontend: http://localhost:5173
echo   API: http://localhost:3001
echo ----------------------------------------
goto menu

:all
echo Starting all servers...
echo.
:: Start Qwen server with venv
start "Qwen Server" cmd /k "cd /d %PROJECT_DIR% && call venv\Scripts\activate.bat && python python/server.py --port 8000"
echo   [+] Qwen-Image-Edit started (port 8000)

:: Start API server
start "API Server" cmd /k "cd /d %PROJECT_DIR% && npm run server"
echo   [+] API server started (port 3001)

timeout /t 2 >nul

:: Start Frontend
start "Frontend" cmd /k "cd /d %PROJECT_DIR% && npm run dev"
echo   [+] Frontend started (port 5173)

echo.
echo ----------------------------------------
echo   All servers started!
echo   Frontend: http://localhost:5173
echo ----------------------------------------
echo.
echo Close all server windows to stop.
echo.
goto menu

:end
echo Goodbye!
exit
