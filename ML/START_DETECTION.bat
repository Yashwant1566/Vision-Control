@echo off
REM Quick Start for Arrow Detection System
REM This automatically handles ESP32 initialization

echo ========================================
echo   ARROW DETECTION - QUICK START
echo ========================================
echo.

cd /d "%~dp0"

echo Activating Python environment...
if exist "espcam_venv\Scripts\activate.bat" (
    call espcam_venv\Scripts\activate.bat
) else if exist "yolovenv\Scripts\activate.bat" (
    call yolovenv\Scripts\activate.bat
) else (
    echo Warning: No virtual environment found, using system Python
)

echo.
echo Starting detection system...
python start_detection.py

pause
