# Start all Event Booking System microservices concurrently on Windows 11
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$Python = "$RootDir\.venv\Scripts\python.exe"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Starting Event Booking System Services (Windows 11)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Auth Service (:8001)
Write-Host "Launching Auth Service on :8001..." -ForegroundColor Green
Start-Process -FilePath $Python -ArgumentList "-m uvicorn app.main:app --app-dir services/auth-service --host 127.0.0.1 --port 8001" -WorkingDirectory $RootDir

# 2. Event Service (:8002)
Write-Host "Launching Event Service on :8002..." -ForegroundColor Green
Start-Process -FilePath $Python -ArgumentList "-m uvicorn app.main:app --app-dir services/event-service --host 127.0.0.1 --port 8002" -WorkingDirectory $RootDir

# 3. Booking Service (:8003)
Write-Host "Launching Booking Service on :8003..." -ForegroundColor Green
Start-Process -FilePath $Python -ArgumentList "-m uvicorn app.main:app --app-dir services/booking-service --host 127.0.0.1 --port 8003" -WorkingDirectory $RootDir

# 4. Notification Service (:8004)
Write-Host "Launching Notification Service on :8004..." -ForegroundColor Green
Start-Process -FilePath $Python -ArgumentList "-m uvicorn app.main:app --app-dir services/notification-service --host 127.0.0.1 --port 8004" -WorkingDirectory $RootDir

# 5. API Gateway (:8000)
Write-Host "Launching API Gateway on :8000..." -ForegroundColor Magenta
Start-Process -FilePath $Python -ArgumentList "-m uvicorn app.main:app --app-dir services/api-gateway --host 127.0.0.1 --port 8000" -WorkingDirectory $RootDir

# 6. Frontend (:5173)
Write-Host "Launching React Vite Frontend on :5173..." -ForegroundColor Yellow
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory "$RootDir\frontend"

Write-Host "`nAll 5 microservices + frontend spawned successfully!" -ForegroundColor Cyan
Write-Host "Open frontend at: http://localhost:5173" -ForegroundColor White
Write-Host "API Gateway Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "To stop all services, run: .\scripts\stop-all.ps1" -ForegroundColor Gray
