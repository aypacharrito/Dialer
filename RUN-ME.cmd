@echo off
setlocal
cd /d "%~dp0"
echo This launcher must be copied into the ROOT of your Dialer repository.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply-pacifica-message-cleanup.ps1"
echo.
pause
