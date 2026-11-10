@echo off
echo ======================================================
echo  Launching SmartStock PRO Full Stack System
echo ======================================================
echo 1. Launching Backend API (Port 8000)...
start "SmartStock - Backend API" cmd /c "%~dp0start_backend.bat"

echo 2. Launching AI Service (Port 5000)...
start "SmartStock - AI Service" cmd /c "%~dp0start_ai.bat"

echo 3. Launching Frontend (Port 5173)...
start "SmartStock - Frontend UI" cmd /c "%~dp0start_frontend.bat"

echo.
echo All services launched!
echo Access the application in your browser at: http://localhost:5173
echo.
pause
