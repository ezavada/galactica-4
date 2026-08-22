@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0gad4.ps1" %*
exit /b %errorlevel%
