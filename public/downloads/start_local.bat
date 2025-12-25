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
        echo      cd Qwen-Image-Edit-2511
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

:menu
echo Select server to start:
echo.
echo   [1] Qwen-Image-Edit (Main)     - Port 8000
echo   [2] BAGEL-7B-MoT               - Port 3002
echo   [3] Z-Image-Turbo              - Port 3003
echo   [4] Real-ESRGAN (Upscale)      - Port 3004
echo   [5] FLUX.2 [dev]               - Port 3005
echo   [6] Frontend + API Server
echo   [7] Start All
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
echo.
echo [2/3] Creating Python virtual environment...
if not exist "venv" python -m venv venv
call venv\Scripts\activate.bat
echo.
echo [3/3] Installing Python packages...
pip install -r python/requirements.txt
echo.
echo [OK] Installation complete!
echo.
pause
goto menu

:qwen
echo Starting Qwen-Image-Edit server...
if exist "venv\Scripts\activate.bat" call venv\Scripts\activate.bat
start "Qwen Server" cmd /k "cd /d %CD% && python python/server.py --port 8000"
goto menu

:bagel
echo Starting BAGEL server...
if exist "venv\Scripts\activate.bat" call venv\Scripts\activate.bat
start "BAGEL Server" cmd /k "cd /d %CD% && python python/bagel_server.py --port 3002"
goto menu

:zimage
echo Starting Z-Image-Turbo server...
if exist "venv\Scripts\activate.bat" call venv\Scripts\activate.bat
start "Z-Image Server" cmd /k "cd /d %CD% && python python/zimage_server.py --port 3003"
goto menu

:upscale
echo Starting Upscale server...
if exist "venv\Scripts\activate.bat" call venv\Scripts\activate.bat
start "Upscale Server" cmd /k "cd /d %CD% && python python/upscale_server.py --port 3004"
goto menu

:flux2
echo Starting FLUX.2 server...
if exist "venv\Scripts\activate.bat" call venv\Scripts\activate.bat
start "FLUX.2 Server" cmd /k "cd /d %CD% && python python/flux2_server.py --port 3005"
goto menu

:frontend
echo Starting Frontend + API server...
start "API Server" cmd /k "cd /d %CD% && npm run server"
timeout /t 2 >nul
start "Frontend" cmd /k "cd /d %CD% && npm run dev"
echo.
echo ----------------------------------------
echo   Frontend: http://localhost:5173
echo   API: http://localhost:3001
echo ----------------------------------------
goto menu

:all
echo Starting all servers...
if exist "venv\Scripts\activate.bat" call venv\Scripts\activate.bat
start "Qwen Server" cmd /k "cd /d %CD% && python python/server.py --port 8000"
start "API Server" cmd /k "cd /d %CD% && npm run server"
timeout /t 2 >nul
start "Frontend" cmd /k "cd /d %CD% && npm run dev"
echo.
echo ----------------------------------------
echo   All servers started!
echo   Frontend: http://localhost:5173
echo ----------------------------------------
goto menu

:end
echo Goodbye!
exit
