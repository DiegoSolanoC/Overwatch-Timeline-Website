@echo off
echo Starting Timeline Overwatch Server...
echo.

REM Change to the script's directory (where the .bat file is)
cd /d "%~dp0"

REM Check Node is available
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js not found. Please install Node.js and add it to PATH.
    pause
    exit /b 1
)

REM Generate manifest
echo Generating manifest...
call node generate-manifest.js
if errorlevel 1 (
    echo Error generating manifest!
    pause
    exit /b 1
)

REM Start server in a new window (server-run.bat runs in project dir)
echo Starting server...
start "Timeline Overwatch Server" "%~dp0server-run.bat"

REM Wait for server to be ready (5 seconds so port 8000 is listening)
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

REM Open Chrome (use default browser if chrome.exe not in PATH)
echo Opening Chrome...
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "http://localhost:8000"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "http://localhost:8000"
) else (
    start "" "http://localhost:8000"
)

echo.
echo If Chrome shows "connection refused", check the "Timeline Overwatch Server" window for errors.
echo Server runs at http://localhost:8000 - you can also open that in your browser manually.
echo.
pause
