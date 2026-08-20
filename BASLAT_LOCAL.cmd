@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js bulunamadi.
 echo Once Node.js LTS kurman gerekiyor: https://nodejs.org/
 pause
 exit /b 1
)
start "" http://127.0.0.1:3000
node local-server.mjs
pause
