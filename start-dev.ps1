$bunPath = "C:\Users\Harsh\.bun\bin"
if ($env:PATH -notlike "*$bunPath*") {
    $env:PATH = "$bunPath;$env:PATH"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Code With Mosh Helpdesk (Bun + Express + React)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# Start PostgreSQL if not already running
if (!(Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue)) {
    Write-Host "Starting PostgreSQL engine..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\PostgreSQL\17\bin\postgres.exe" -ArgumentList "-D `"C:\Program Files\PostgreSQL\17\data`"" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# Free ports 3000, 5173, 5555 if occupied
3000, 5173, 5555 | ForEach-Object {
    Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Start-Process cmd -ArgumentList "/k", "set `"PATH=C:\Users\Harsh\.bun\bin;%PATH%`" && cd /d `"$PSScriptRoot\server`" && bun run dev"
Start-Process cmd -ArgumentList "/k", "set `"PATH=C:\Users\Harsh\.bun\bin;%PATH%`" && cd /d `"$PSScriptRoot\client`" && bun run dev"
Start-Process cmd -ArgumentList "/k", "set `"PATH=C:\Users\Harsh\.bun\bin;%PATH%`" && cd /d `"$PSScriptRoot\server`" && bun run studio"

Write-Host ""
Write-Host "All services launched in separate windows!" -ForegroundColor Green
Write-Host "Frontend App:    http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend API:     http://localhost:3000" -ForegroundColor Yellow
Write-Host "Database Studio: http://localhost:5555" -ForegroundColor Yellow
Write-Host ""
Write-Host "Default Login:" -ForegroundColor White
Write-Host "Email:    admin@example.com" -ForegroundColor Cyan
Write-Host "Password: AdminPassword123!" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
