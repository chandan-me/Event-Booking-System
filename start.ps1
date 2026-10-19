# Master launcher for Event Booking System
$RootDir = $PSScriptRoot
Set-Location $RootDir

$Python = if (Test-Path "$RootDir\.venv\Scripts\python.exe") {
    "$RootDir\.venv\Scripts\python.exe"
} elseif (Test-Path "$RootDir\backend\.venv\Scripts\python.exe") {
    "$RootDir\backend\.venv\Scripts\python.exe"
} else {
    "python.exe"
}

& $Python main.py $args
