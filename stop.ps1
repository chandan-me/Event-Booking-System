# Stop all Event Booking System processes and services
$ports = @(8000, 8001, 8002, 8003, 8004, 5173)

Write-Host "Stopping Event Booking System services on ports: $($ports -join ', ')..." -ForegroundColor Yellow

foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($conn in $conns) {
                $pidToKill = $conn.OwningProcess
                if ($pidToKill -and $pidToKill -ne 0) {
                    Write-Host "Stopping process PID $pidToKill on port $port..." -ForegroundColor Red
                    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } catch {}
}

Write-Host "All Event Booking System services stopped successfully." -ForegroundColor Green
