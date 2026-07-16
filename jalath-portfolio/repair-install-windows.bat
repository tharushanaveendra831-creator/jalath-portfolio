@echo off
setlocal
title Jalath Portfolio Repair
cd /d "%~dp0"
set "npm_config_registry=https://registry.npmjs.org/"

echo ==============================================
echo   Repairing Jalath Portfolio Installation
echo ==============================================
echo.
echo Close VS Code and any other terminal using this folder before continuing.
echo This removes only downloaded Node packages and rebuilds them.
echo.
pause

if exist "node_modules" (
  echo Removing incomplete node_modules...
  rmdir /s /q "node_modules"
)

if exist "package-lock.json" (
  echo Removing the old package lock...
  del /f /q "package-lock.json"
)

echo Setting the public npm registry...
call npm.cmd config set registry https://registry.npmjs.org/
if errorlevel 1 goto :fail

echo Verifying npm cache...
call npm.cmd cache verify
if errorlevel 1 goto :fail

echo Installing packages...
call npm.cmd install --registry=https://registry.npmjs.org/
if errorlevel 1 goto :fail

echo.
echo Installation completed successfully.
echo Starting the website...
start "Jalath Portfolio Server" cmd /k "cd /d ""%~dp0"" && npm.cmd start"
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"
pause
exit /b 0

:fail
echo.
echo Repair failed. Copy the complete error and send it for diagnosis.
pause
exit /b 1
