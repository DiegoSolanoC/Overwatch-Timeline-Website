@echo off
REM Run this in the project folder so server starts in the right place
cd /d "%~dp0"

echo.
echo Starting Node server on http://localhost:8000
echo.

REM Ensure no other process is already using port 8000
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Port 8000 is already in use - PID %%p - attempting to stop it...
    taskkill /F /PID %%p >nul 2>nul
)

node server.js

if errorlevel 1 (
    echo.
    echo Server exited with an error. Check that Node.js is installed: node --version
    echo.
)

pause
