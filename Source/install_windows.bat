@echo off
REM Installation script for Premiere Pro File Manager Extension (Windows)

echo ==========================================
echo File Manager Extension - Installation
echo ==========================================
echo.

REM Extension details
set EXTENSION_NAME=PremiereFileManager
set EXTENSION_ID=com.filemanager.premiere

REM Get the directory where the script is located
set SCRIPT_DIR=%~dp0

REM CEP extension directory for Windows
set CEP_DIR=%APPDATA%\Adobe\CEP\extensions

REM Create CEP directory if it doesn't exist
if not exist "%CEP_DIR%" (
    echo Creating CEP extensions directory...
    mkdir "%CEP_DIR%"
)

REM Target installation directory
set INSTALL_DIR=%CEP_DIR%\%EXTENSION_NAME%

REM Remove existing installation if present
if exist "%INSTALL_DIR%" (
    echo Removing existing installation...
    rmdir /s /q "%INSTALL_DIR%"
)

REM Copy extension files
echo Installing extension...
xcopy /E /I /Y "%SCRIPT_DIR%" "%INSTALL_DIR%"

REM Remove installation scripts from installed directory
del /q "%INSTALL_DIR%\install_macos.sh"
del /q "%INSTALL_DIR%\install_windows.bat"

echo.
echo Installation completed successfully!
echo.
echo Extension installed to:
echo %INSTALL_DIR%
echo.
echo ==========================================

REM Registry Hacks (PlayerDebugMode)
echo.
echo Enabling PlayerDebugMode (Registry)...
echo    Setting CSXS 10-16 debug flags...

reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.14" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.15" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.16" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
echo Next steps:
echo ==========================================
echo 1. Restart Adobe Premiere Pro
echo 2. Open the extension: Window ^> Extensions ^> File Manager
echo.
echo Note: If the extension doesn't appear, you may need to enable
echo debug mode for CEP extensions. See README for instructions.
echo.
pause
