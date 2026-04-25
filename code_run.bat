@echo off
SET PYTHONUTF8=1

echo ============================================
echo   GramSphere - Starting All Services
echo ============================================
echo.

:: Start Backend (FastAPI) in a new terminal window
echo [1/2] Starting Backend (FastAPI on port 8000)...
start "GramSphere Backend" cmd /k "cd /d %~dp0gram-sphere && ..\.venv\Scripts\python.exe -m fastapi dev main.py"

:: Give the backend a moment to boot before starting frontend
timeout /t 3 /nobreak >nul

:: Start Frontend (Vite on port 5173) in a new terminal window
echo [2/2] Starting Frontend (Vite on port 5173)...
start "GramSphere Frontend" cmd /k "cd /d %~dp0gram-sphere\frontend && npm run dev"

echo.
echo ============================================
echo   Both servers are starting!
echo.
echo   Backend:  http://127.0.0.1:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://127.0.0.1:8000/docs
echo ============================================
echo.
echo Close this window anytime. The servers run independently.
pause
