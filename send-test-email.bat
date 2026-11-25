@echo off
set "PATH=C:\Users\Harsh\.bun\bin;%PATH%"
title Helpdesk Test Email Sender
cls
echo ========================================================
echo   Helpdesk - Test Customer Email Sender
echo ========================================================
echo.
cd /d "%~dp0server"
bun run scripts/send-test-email.ts
echo.
pause
