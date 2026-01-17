@echo off
echo === Qwen-Image-Edit-2511 Cloudflare Pages Deploy ===
echo.

echo Checking authentication...
call npx wrangler whoami >nul 2>&1
if errorlevel 1 (
    echo.
    echo [INFO] Cloudflare login required.
    echo Opening browser for authentication...
    call npx wrangler login
    if errorlevel 1 (
        echo [ERROR] Login failed.
        exit /b 1
    )
)

echo.
echo [OK] Authenticated with Cloudflare
echo.

echo Deploying to Cloudflare Pages...
call npx wrangler pages deploy dist --project-name=qwen-image-edit

if errorlevel 1 (
    echo.
    echo [ERROR] Deploy failed
    exit /b 1
)

echo.
echo === Deploy Complete ===
echo.
echo Your app is live at: https://qwen-image-edit.pages.dev
echo.
pause
