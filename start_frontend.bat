@echo off
title SmartStock PRO - Frontend UI (Port 5173)
cd /d "%~dp0frontend"
echo ======================================================
echo  Starting SmartStock Frontend on http://localhost:5173
echo ======================================================
npm run dev
pause
