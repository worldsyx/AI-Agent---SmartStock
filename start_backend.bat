@echo off
title SmartStock PRO - Backend API (Port 8000)
cd /d "%~dp0backend"
echo ======================================================
echo  Starting SmartStock Backend API on http://127.0.0.1:8000
echo ======================================================
php artisan serve --port=8000
pause
