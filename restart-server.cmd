@echo off
echo Killing process on port 3000...
powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"

echo Starting server on port 3000...
cd /d C:\Users\marco\Marnagement
npm run dev

pause