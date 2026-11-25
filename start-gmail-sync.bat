
@echo off
set "PATH=C:\Users\Harsh\.bun\bin;%PATH%"
title Helpdesk Live Gmail Listener
cls
echo ========================================================
echo   Helpdesk Live Gmail Sync (Real-Time Inbound Email)
echo ========================================================
echo.
cd /d "%~dp0server"
bun run scripts/gmail-listener.ts
pause
