@echo off
title Qwen-Image-Edit Local Launcher

echo ========================================
echo   Qwen-Image-Edit Local Launcher
echo ========================================
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
echo   [0] Exit
echo.
set /p choice="Choice (0-7): "

if "%choice%"=="1" goto qwen
if "%choice%"=="2" goto bagel
if "%choice%"=="3" goto zimage
if "%choice%"=="4" goto upscale
if "%choice%"=="5" goto flux2
if "%choice%"=="6" goto frontend
if "%choice%"=="7" goto all
if "%choice%"=="0" goto end
goto menu

:qwen
echo Starting Qwen-Image-Edit server...
start "Qwen Server" cmd /k "cd /d %~dp0 && python python/server.py --port 8000"
goto menu

:bagel
echo Starting BAGEL server...
start "BAGEL Server" cmd /k "cd /d %~dp0 && python python/bagel_server.py --port 3002"
goto menu

:zimage
echo Starting Z-Image-Turbo server...
start "Z-Image Server" cmd /k "cd /d %~dp0 && python python/zimage_server.py --port 3003"
goto menu

:upscale
echo Starting Upscale server...
start "Upscale Server" cmd /k "cd /d %~dp0 && python python/upscale_server.py --port 3004"
goto menu

:flux2
echo Starting FLUX.2 server...
start "FLUX.2 Server" cmd /k "cd /d %~dp0 && python python/flux2_server.py --port 3005"
goto menu

:frontend
echo Starting Frontend + API server...
start "API Server" cmd /k "cd /d %~dp0 && bun run server/index.ts"
timeout /t 2 >nul
start "Frontend" cmd /k "cd /d %~dp0 && npm run dev"
echo.
echo ----------------------------------------
echo   Frontend: http://localhost:5173
echo   API: http://localhost:3001
echo ----------------------------------------
goto menu

:all
echo Starting all servers...
start "Qwen Server" cmd /k "cd /d %~dp0 && python python/server.py --port 8000"
start "API Server" cmd /k "cd /d %~dp0 && bun run server/index.ts"
timeout /t 2 >nul
start "Frontend" cmd /k "cd /d %~dp0 && npm run dev"
echo.
echo ----------------------------------------
echo   All servers started!
echo   Frontend: http://localhost:5173
echo ----------------------------------------
goto menu

:end
echo Goodbye!
exit
