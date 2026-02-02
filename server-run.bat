@echo off
REM Run this in the project folder so server starts in the right place
cd /d "%~dp0"

echo.
echo Starting Node server on http://localhost:8000
echo.

node server.js

if errorlevel 1 (
    echo.
    echo Server exited with an error. Check that Node.js is installed: node --version
    echo.
)

pause
