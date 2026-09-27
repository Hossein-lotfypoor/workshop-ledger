@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist node_modules (
  echo نصب وابستگی‌ها...
  call npm install
)

if not exist dist (
  echo ساخت نسخه اجرایی...
  call npm run build
)

start "Workshop Ledger Server" /min cmd /c "node server/index.js"
timeout /t 3 /nobreak >nul
start http://localhost:3000/workshop-ledger/
exit
