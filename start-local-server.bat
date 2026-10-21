@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  set "PYTHON_CMD=py"
  goto launch
)

where python >nul 2>nul
if %errorlevel%==0 (
  set "PYTHON_CMD=python"
  goto launch
)

echo Python was not found.
echo Open this folder in Visual Studio Code and run index.html with the Live Server extension.
pause
exit /b 1

:launch
echo Starting Filmography on http://127.0.0.1:8000
start "" cmd /c "timeout /t 2 /nobreak ^>nul ^& start http://127.0.0.1:8000"
%PYTHON_CMD% -m http.server 8000
pause
