@echo off
title Kisan Alert — Dev Launcher
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║        Kisan Alert — Starting Up         ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── Check .env ────────────────────────────────────────────────────────────
if not exist "%~dp0.env" (
    echo  [WARN] .env not found — copying from .env.example
    copy "%~dp0.env.example" "%~dp0.env" >nul
    echo  [INFO] Edit .env and add your GEMINI_API_KEY before running again.
    echo.
)

:: ── Start Backend in new window ────────────────────────────────────────────
echo  [1/2] Starting FastAPI backend on http://localhost:8000 ...
start "Kisan Alert — Backend" cmd /k "cd /d "%~dp0" && python -m uvicorn backend.main:app --reload --port 8000"

:: ── Wait a moment for backend to boot ─────────────────────────────────────
timeout /t 3 /nobreak >nul

:: ── Start Frontend in new window ──────────────────────────────────────────
echo  [2/2] Starting React frontend on http://localhost:5173 ...
start "Kisan Alert — Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: ── Wait for Vite to be ready ─────────────────────────────────────────────
timeout /t 5 /nobreak >nul

:: ── Open browser ──────────────────────────────────────────────────────────
echo.
echo  Opening browser...
start "" "http://localhost:5173"

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║  ✅  Kisan Alert is running!              ║
echo  ║                                          ║
echo  ║  Frontend : http://localhost:5173        ║
echo  ║  Backend  : http://localhost:8000        ║
echo  ║  API Docs : http://localhost:8000/docs   ║
echo  ║                                          ║
echo  ║  Close the two terminal windows to stop. ║
echo  ╚══════════════════════════════════════════╝
echo.
pause
