@echo off
cd /d "%~dp0"
start /B serve -s dist -l 3000
timeout /t 2 /nobreak >nul
start http://localhost:3000
exit