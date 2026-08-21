@echo off
setlocal
cd /d "%~dp0"
title AL-SAT BOT PRO

echo ======================================
echo   AL-SAT BOT PRO - BASLATILIYOR
echo ======================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi.
  echo https://nodejs.org adresinden Node.js LTS kur.
  echo Kurduktan sonra bu dosyaya tekrar cift tikla.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do echo Node.js: %%v

echo.
echo Tarayici birazdan acilacak.
echo Sunucu bu pencerede calisacak; bu pencereyi kapatma.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:3000'"
node local-server.mjs

echo.
echo [HATA] Sunucu kapandi veya baslatilamadi.
echo Yukaridaki hata mesajinin ekran goruntusunu bana gonder.
pause
