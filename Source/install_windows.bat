@echo off
REM Install File Manager atomically in the current user's CEP extensions directory.
setlocal EnableExtensions EnableDelayedExpansion

set "EXTENSION_NAME=PremiereFileManager"
set "SCRIPT_DIR=%~dp0"
set "CEP_DIR=%APPDATA%\Adobe\CEP\extensions"
set "INSTALL_DIR=%CEP_DIR%\%EXTENSION_NAME%"
set "STAGING_DIR=%CEP_DIR%\.%EXTENSION_NAME%.staging-%RANDOM%-%RANDOM%"
set "BACKUP_DIR=%CEP_DIR%\.%EXTENSION_NAME%.backup-%RANDOM%-%RANDOM%"
set "NO_PAUSE=0"
set "DEBUG_OK=0"

if /I "%~1"=="--no-pause" set "NO_PAUSE=1"

echo ==========================================
echo File Manager Extension - Installation
echo ==========================================

if exist "%SCRIPT_DIR%CSXS\manifest.xml" goto source_ok
set "FAIL_MESSAGE=The installer must be run from the extension Source folder."
goto fail

:source_ok
if exist "%CEP_DIR%" goto cep_dir_ok
mkdir "%CEP_DIR%"
if not errorlevel 1 goto cep_dir_ok
set "FAIL_MESSAGE=Unable to create the CEP extensions directory."
goto fail

:cep_dir_ok
REM Keep every destructive operation scoped to the expected per-user extension directory.
if /I "%INSTALL_DIR%"=="%CEP_DIR%\%EXTENSION_NAME%" goto install_path_ok
set "FAIL_MESSAGE=Unexpected installation path."
goto fail

:install_path_ok
if exist "%STAGING_DIR%" rmdir /s /q "%STAGING_DIR%"
if exist "%BACKUP_DIR%" rmdir /s /q "%BACKUP_DIR%"

echo Copying extension files to staging...
xcopy "%SCRIPT_DIR%*" "%STAGING_DIR%\" /E /I /Y /Q >nul
if not errorlevel 1 goto staging_copy_ok
set "FAIL_MESSAGE=Unable to copy extension files to staging."
goto fail

:staging_copy_ok

if exist "%STAGING_DIR%\install_macos.sh" del /q "%STAGING_DIR%\install_macos.sh"
if exist "%STAGING_DIR%\install_windows.bat" del /q "%STAGING_DIR%\install_windows.bat"
if exist "%STAGING_DIR%\CSXS\manifest.xml" goto staging_valid
set "FAIL_MESSAGE=Staging validation failed."
goto fail

:staging_valid

if exist "%INSTALL_DIR%" move "%INSTALL_DIR%" "%BACKUP_DIR%" >nul
if not exist "%INSTALL_DIR%" goto backup_valid
set "FAIL_MESSAGE=Unable to preserve the current installation."
goto fail

:backup_valid
move "%STAGING_DIR%" "%INSTALL_DIR%" >nul
if exist "%INSTALL_DIR%\CSXS\manifest.xml" goto install_valid
set "FAIL_MESSAGE=Unable to activate the new installation."
goto restore_and_fail

:install_valid

if exist "%BACKUP_DIR%" rmdir /s /q "%BACKUP_DIR%"
echo Enabling PlayerDebugMode for unsigned extensions...
for %%V in (7 8 9 10 11 12 13 14 15 16 17 18 19 20) do call :enable_debug %%V
if "%DEBUG_OK%"=="0" echo WARNING: PlayerDebugMode could not be enabled automatically.

echo.
echo Installation completed successfully: %INSTALL_DIR%
echo Restart Adobe Premiere Pro, then open Window ^> Extensions ^> File Manager.
goto finish

:enable_debug
REM Enable each supported CEP runtime independently so one unavailable key does not abort installation.
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.%~1" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
if not errorlevel 1 set /a DEBUG_OK+=1
exit /b 0

:restore_and_fail
if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%"
if exist "%BACKUP_DIR%" move "%BACKUP_DIR%" "%INSTALL_DIR%" >nul
goto fail

:fail
echo.
echo ERROR: %FAIL_MESSAGE%
if "%NO_PAUSE%"=="0" pause
exit /b 1

:finish
if "%NO_PAUSE%"=="0" pause
exit /b 0
