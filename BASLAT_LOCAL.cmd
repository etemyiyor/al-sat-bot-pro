@echo off
setlocal
cd /d "%~dp0"
title AL-SAT BOT PRO LOCAL

echo ======================================
echo   AL-SAT BOT PRO - LOCAL BASLATICI
echo ======================================
echo.
where node >nul 2>&1
if errorlevel 1 (
 echo [HATA] Node.js bulunamadi.
 echo Node.js LTS kur: https://nodejs.org/
 pause
 exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo Node.js: %%v

echo.
echo Sunucu baslatiliyor...
start "AL-SAT BOT SERVER" cmd /k "cd /d "%~dp0" && node local-server.mjs"
timeout /t 2 /nobreak >nul
powershell -NoProfile -Command "try { $r=Invoke-RestMethod http://127.0.0.1:3000/api/health -TimeoutSec 5; if($r.ok){exit 0}else{exit 1} } catch { exit 1 }"
if errorlevel 1 (
 echo [HATA] Sunucu acilmadi.
 echo Acilan AL-SAT BOT SERVER penceresindeki hatayi bana gonder.
 pause
 exit /b 1
)

echo [OK] Sunucu calisiyor.
echo.
echo Bilgisayar: http://127.0.0.1:3000
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "$r=Invoke-RestMethod http://127.0.0.1:3000/api/health; $r.lan | ForEach-Object { 'http://' + $_ + ':3000' }"') do echo Telefon: %%i

echo.
echo Telefon ve bilgisayar ayni Wi-Fi'da olmali.
echo Windows Guvenlik Duvari sorarsa Node.js icin Ozel aglara izin ver.
start "" "http://127.0.0.1:3000"
pause
