@echo off
set "PATH=C:\Users\Harsh\.bun\bin;C:\Program Files\PostgreSQL\17\bin;%PATH%"

echo ==========================================================
echo  Starting Code With Mosh Helpdesk (Bun + Express + React)
echo ==========================================================

:: Start PostgreSQL if not already running
powershell -NoProfile -Command "if (!(Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue)) { Start-Process 'C:\Program Files\PostgreSQL\17\bin\postgres.exe' -ArgumentList '-D \"C:\Program Files\PostgreSQL\17\data\"' -WindowStyle Hidden }"

powershell -NoProfile -Command "3000, 5173, 5555 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"

start "Helpdesk Express Backend (Port 3000)" cmd /k "cd /d "%~dp0server" && bun run dev"
start "Helpdesk React Frontend (Port 5173)" cmd /k "cd /d "%~dp0client" && bun run dev"
start "Helpdesk Database Studio (Port 5555)" cmd /k "cd /d "%~dp0server" && bun run studio"

echo.
echo All services launched in separate windows!
echo Frontend App:    http://localhost:5173
echo Backend API:     http://localhost:3000
echo Database Studio: http://localhost:5555
echo.
echo Login Credentials:
echo Email:    admin@example.com
echo Password: AdminPassword123!
echo ==========================================================
