@echo off
title Event Booking System — Master Runner
cd /d "%~dp0"
echo Starting Event Booking System...
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" main.py %*
) else if exist "backend\.venv\Scripts\python.exe" (
    "backend\.venv\Scripts\python.exe" main.py %*
) else (
    python main.py %*
)
pause
