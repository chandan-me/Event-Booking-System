# =====================================================================
# EventPass — Database Seed & Initialization Utility (PowerShell)
# Seeds all 4 microservice databases with verified users, events & tickets
# =====================================================================
$Host.UI.RawUI.WindowTitle = "EventPass — Database Seeder"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "EventPass Platform — Database Seeding & Synchronization" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$VENV_PYTHON = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-Not (Test-Path $VENV_PYTHON)) {
    $VENV_PYTHON = Join-Path $PSScriptRoot "backend\.venv\Scripts\python.exe"
}
if (-Not (Test-Path $VENV_PYTHON)) {
    $VENV_PYTHON = "python"
}

Write-Host "Executing database seeder using $VENV_PYTHON..." -ForegroundColor Green
& $VENV_PYTHON (Join-Path $PSScriptRoot "backend\scripts\seed_database.py") --dump

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDatabase seeded successfully!" -ForegroundColor Green
    Write-Host "You can now start the application with .\start.ps1" -ForegroundColor Cyan
} else {
    Write-Host "`nSeeding encountered an error. Check MySQL server status on port 3306." -ForegroundColor Red
}
