@echo off
title Qwen-Image-Edit Setup

echo ========================================
echo   Qwen-Image-Edit Local Setup
echo ========================================
echo.

:: Check if git is installed
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed!
    echo Please install Git from: https://git-scm.com/download/win
    pause
    exit /b 1
)

:: Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed!
    echo Please install Python 3.10+ from: https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Git found
echo [OK] Python found
echo [OK] Node.js found
echo.

:: Ask for installation directory
set "DEFAULT_DIR=%USERPROFILE%\Qwen-Image-Edit"
set /p "INSTALL_DIR=Installation directory [%DEFAULT_DIR%]: "
if "%INSTALL_DIR%"=="" set "INSTALL_DIR=%DEFAULT_DIR%"

echo.
echo Installing to: %INSTALL_DIR%
echo.

:: Clone repository
if exist "%INSTALL_DIR%" (
    echo Directory already exists. Updating...
    cd /d "%INSTALL_DIR%"
    git pull
) else (
    echo Cloning repository...
    git clone https://github.com/your-repo/Qwen-Image-Edit-2511.git "%INSTALL_DIR%"
    cd /d "%INSTALL_DIR%"
)

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to clone/update repository
    pause
    exit /b 1
)

echo.
echo [OK] Repository ready
echo.

:: Install Node dependencies
echo Installing Node.js dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [WARNING] npm install failed, trying with --legacy-peer-deps
    call npm install --legacy-peer-deps
)

echo.
echo [OK] Node.js dependencies installed
echo.

:: Create Python virtual environment
echo Setting up Python environment...
if not exist "venv" (
    python -m venv venv
)
call venv\Scripts\activate.bat

:: Install Python dependencies
echo Installing Python dependencies...
pip install -r python/requirements.txt

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Project installed to: %INSTALL_DIR%
echo.
echo To start the servers:
echo   1. Open a terminal in %INSTALL_DIR%
echo   2. Run: start_local.bat
echo.
echo Or run these commands manually:
echo   cd /d "%INSTALL_DIR%"
echo   venv\Scripts\activate
echo   python python/server.py --port 8000
echo.

:: Copy start_local.bat to install directory if not exists
if not exist "%INSTALL_DIR%\start_local.bat" (
    copy "%~dp0start_local.bat" "%INSTALL_DIR%\" >nul 2>nul
)

:: Ask to start now
set /p "START_NOW=Start servers now? (y/n): "
if /i "%START_NOW%"=="y" (
    cd /d "%INSTALL_DIR%"
    call start_local.bat
)

pause
