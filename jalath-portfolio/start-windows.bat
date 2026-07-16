@echo off
setlocal
title Jalath Portfolio Setup
cd /d "%~dp0"

set "npm_config_registry=https://registry.npmjs.org/"

echo ==============================================
echo   Jalath Tharusha Portfolio - Windows Setup
echo ==============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed or is not available in PATH.
  echo Install the Node.js LTS version, restart Windows, and run this file again.
  echo Website: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm was not found. Reinstall the Node.js LTS version.
  echo.
  pause
  exit /b 1
)

echo Node version:
node -v
echo npm version:
call npm.cmd -v
echo Registry:
call npm.cmd config get registry
echo.

if not exist ".env" (
  echo Creating .env file...
  copy /Y ".env.example" ".env" >nul
)

echo Installing required packages from the public npm registry...
call npm.cmd install --registry=https://registry.npmjs.org/
if errorlevel 1 (
  echo.
  echo ERROR: Package installation failed.
  echo Close VS Code and other terminals using this folder, then run repair-install-windows.bat.
  echo.
  pause
  exit /b 1
)

echo.
echo Starting the portfolio server...
echo Keep the server window open while using the website.
start "Jalath Portfolio Server" cmd /k "cd /d ""%~dp0"" && npm.cmd start"

timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo Website: http://localhost:3000
echo Admin:   http://localhost:3000/admin
echo.
pause
