@echo off
title UA Manager - Launcher
color 0A

echo ===================================================
echo      UNIFORM AGRI MANAGER - SYSTEM STARTUP
echo ===================================================
echo.

echo [1/2] Starting Backend API Server (Port 8000)...
cd backend
start "UA Manager - API Server" cmd /k "python manage.py runserver"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to start backend server.
    pause
    exit /b
)
cd ..

echo [2/2] Starting Frontend Website (Port 5173)...
cd frontend
start "UA Manager - Frontend Site" cmd /k "npm run dev"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to start frontend server.
    pause
    exit /b
)
cd ..

echo.
echo ===================================================
echo      SYSTEM LAUNCHED SUCCESSFULLY!
echo ===================================================
echo.
echo Access the site at: http://localhost:5173
echo.
echo NOTE: Do NOT close the two new windows that opened.
echo You can minimize them to keep the system running.
echo.
pause
