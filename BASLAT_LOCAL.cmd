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
 echo Kurulumdan sonra bilgisayari veya terminali yeniden ac.
 pause
 exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do echo Node.js: %%v

echo.
echo Sunucu baslatiliyor...
start "AL-SAT BOT SERVER" /min cmd /c "cd /d "%~dp0" && node local-server.mjs"

echo Sunucunun hazirlanmasi bekleniyor...
timeout /t 2 /nobreak >nul

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000 -TimeoutSec 5; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }"
if errorlevel 1 (
 echo [HATA] Sunucu acilmadi.
 echo Asagidaki komutu elle dene:
 echo node local-server.mjs
 echo.
 echo Acilan penceredeki hata mesajini bana gonder.
 pause
 exit /b 1
)

echo [OK] Sunucu calisiyor.
start "" "http://127.0.0.1:3000"
echo.
echo Site: http://127.0.0.1:3000
echo Dashboard: http://127.0.0.1:3000/dashboard.html
echo BIST-ABD: http://127.0.0.1:3000/equities.html
pause
