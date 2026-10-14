# Stop all Event Booking System processes listening on microservice ports
$ports = @(8000, 8001, 8002, 8003, 8004, 5173)

Write-Host "Stopping Event Booking System microservices on ports: $($ports -join ', ')..." -ForegroundColor Yellow

foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($conn in $conns) {
                $pidToKill = $conn.OwningProcess
                if ($pidToKill -and $pidToKill -ne 0) {
                    Write-Host "Killing process PID $pidToKill on port $port..." -ForegroundColor Red
                    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                }
            }
        } else {
            Write-Host "Port ${port}: no active process found." -ForegroundColor Gray
        }
    } catch {
        # Ignore errors if already stopped
    }
}

Write-Host "Cleanup complete." -ForegroundColor Green
