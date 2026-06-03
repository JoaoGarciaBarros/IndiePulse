@echo off
echo.
echo ========================================
echo   RAGETRIGGER — Iniciando sistema...
echo ========================================
echo.

echo [1/2] Iniciando backend (FastAPI na porta 8000)...
start "RageTrigger — Backend" cmd /k "cd /d %~dp0rage-backend && echo BACKEND rodando em http://localhost:8000 && echo Docs em http://localhost:8000/docs && echo. && .venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak > nul

echo [2/2] Iniciando frontend (Vite na porta 5173)...
start "RageTrigger — Frontend" cmd /k "cd /d %~dp0rage-button && echo FRONTEND rodando em http://localhost:5173 && echo. && npm run dev"

echo.
echo ========================================
echo   Tudo rodando!
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo ========================================
echo.
echo Feche as outras janelas do CMD para parar.
echo.
pause
