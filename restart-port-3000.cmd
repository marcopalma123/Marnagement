@echo off
setlocal

echo Restarting app on port 3000...

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":3000 " ^| findstr "LISTENING"') do (
  echo Stopping PID %%P...
  taskkill /PID %%P /T /F >nul 2>&1
)

cd /d "%~dp0"
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run dev' -WorkingDirectory '%~dp0' -WindowStyle Hidden"

timeout /t 3 >nul
echo.
echo Port 3000 status:
netstat -ano | findstr LISTENING | findstr :3000

endlocal
