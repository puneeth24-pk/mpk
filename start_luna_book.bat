@echo off
echo Starting Luna Book...
echo ==================================================
echo 1. Building React Frontend (Production)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Frontend build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 2. Starting Backend Server...
echo The app will be available at: http://localhost:8015
echo.
call venv\Scripts\activate.bat
uvicorn backend:app --port 8015 --host 127.0.0.1
pause
