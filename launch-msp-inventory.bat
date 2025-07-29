@echo off
echo MSP Inventory System v1.0.0
echo =============================
cd /d "%~dp0"

REM Check if Electron is available
if exist "node_modules\electron\dist\electron.exe" (
    echo Starting MSP Inventory System...
    "node_modules\electron\dist\electron.exe" . --no-sandbox
) else (
    echo Error: Electron not found. Please run setup first.
    echo Run: npm install
    pause
)