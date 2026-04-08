@echo off
REM CareBridge Project Startup Script

echo.
echo ========================================
echo   CareBridge Project Startup
echo ========================================
echo.

REM Check if all directories exist
if not exist carebridge-backend (
    echo ERROR: carebridge-backend directory not found
    exit /b 1
)

if not exist carebridge-frontend (
    echo ERROR: carebridge-frontend directory not found
    exit /b 1
)

if not exist ml-service (
    echo ERROR: ml-service directory not found
    exit /b 1
)

echo Starting services in new terminals...
echo.

echo 1. Starting ML Service (Port 8001)...
start cmd /k "cd ml-service && python main.py"
timeout /t 3 /nobreak

echo 2. Starting Backend Service (Port 8081)...
start cmd /k "cd carebridge-backend && .\mvnw spring-boot:run"
timeout /t 5 /nobreak

echo 3. Starting Frontend Service (Port 3000)...
start cmd /k "cd carebridge-frontend && npm run dev"

echo.
echo ========================================
echo Services are starting in new windows...
echo ========================================
echo.
echo Frontend:  http://localhost:3000
echo Backend:   http://localhost:8081
echo ML Service: http://localhost:8001
echo.
echo Close any terminal to stop that service.
echo.
pause
