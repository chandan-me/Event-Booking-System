@echo off
title EventPass - Database Seeder
echo ============================================================
echo EventPass Platform - Database Seeding ^& Synchronization
echo ============================================================

set PYTHON_BIN=.venv\Scripts\python.exe
if not exist %PYTHON_BIN% set PYTHON_BIN=backend\.venv\Scripts\python.exe
if not exist %PYTHON_BIN% set PYTHON_BIN=python

echo Executing seeder using %PYTHON_BIN%...
%PYTHON_BIN% backend\scripts\seed_database.py --dump

echo.
echo Seeding complete! You can start the system using start.bat
pause
