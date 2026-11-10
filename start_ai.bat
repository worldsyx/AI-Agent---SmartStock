@echo off
title SmartStock PRO - AI Data Service (Port 5000)
cd /d "%~dp0ai-service"
echo ======================================================
echo  Starting SmartStock AI Service on http://127.0.0.1:5000
echo ======================================================
python wsgi.py
pause
