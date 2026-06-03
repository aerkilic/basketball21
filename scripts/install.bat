@echo off
setlocal EnableExtensions EnableDelayedExpansion

for %%I in ("%~dp0..") do set "ROOT_DIR=%%~fI"
set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "MOBILE_DIR=%ROOT_DIR%\mobile"
set "IENV_ARGS="

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--help" goto show_help
if /I "%~1"=="-h" goto show_help
if /I "%~1"=="--IEnvFile" (
    shift
    if "%~1"=="" (
        echo [FEHLER] --IEnvFile benoetigt einen Pfad.
        exit /b 2
    )
    set "NEXT=%~1"
    if "!NEXT:~0,2!"=="--" (
        echo [FEHLER] --IEnvFile benoetigt mindestens einen Pfad.
        exit /b 2
    )
    goto collect_ienv
)
set "ARG=%~1"
if /I "!ARG:~0,11!"=="--IEnvFile=" (
    set "ENV_VAL=!ARG:~11!"
    if "!ENV_VAL!"=="" (
        echo [FEHLER] --IEnvFile= darf nicht leer sein.
        exit /b 2
    )
    set "IENV_ARGS=!IENV_ARGS! --ienvfile ^"!ENV_VAL!^""
    shift
    goto parse_args
)
echo [FEHLER] Unbekanntes Argument: %~1
goto show_help_err

:collect_ienv
if "%~1"=="" goto args_done
set "NEXT=%~1"
if "!NEXT:~0,2!"=="--" goto parse_args
set "IENV_ARGS=!IENV_ARGS! --ienvfile ^"%~1^""
shift
goto collect_ienv

:show_help
echo Usage:
echo   .\scripts\install.bat [--IEnvFile ^<pfad-oder-glob^> [weitere-pfade...]]...
echo.
echo Example:
echo   .\scripts\install.bat --IEnvFile C:\daten\backend.env C:\daten\mobile.env
echo   .\scripts\install.bat --IEnvFile .\backend.env --IEnvFile .\mobile.env
exit /b 0

:show_help_err
echo Usage:
echo   .\scripts\install.bat [--IEnvFile ^<pfad-oder-glob^> [weitere-pfade...]]...
exit /b 2

:args_done
where py >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON=py -3"
) else (
    where python >nul 2>nul || (echo [FEHLER] Python 3 nicht gefunden. & exit /b 1)
    set "PYTHON=python"
)
where node >nul 2>nul || (echo [FEHLER] Node.js nicht gefunden. & exit /b 1)
where npm >nul 2>nul || (echo [FEHLER] npm nicht gefunden. & exit /b 1)

if not exist "%ROOT_DIR%\.env" copy "%ROOT_DIR%\.env.example" "%ROOT_DIR%\.env" >nul
if not exist "%BACKEND_DIR%\.env" copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
if not exist "%FRONTEND_DIR%\.env" copy "%FRONTEND_DIR%\.env.example" "%FRONTEND_DIR%\.env" >nul
if not exist "%MOBILE_DIR%\.env" copy "%MOBILE_DIR%\.env.example" "%MOBILE_DIR%\.env" >nul
if not exist "%ROOT_DIR%\deploy\app.env" copy "%ROOT_DIR%\deploy\app.env.example" "%ROOT_DIR%\deploy\app.env" >nul

if not "!IENV_ARGS!"=="" (
    echo [INFO] Merge von --IEnvFile Dateien...
    call %PYTHON% "%ROOT_DIR%\scripts\apply_env_inputs.py" --root "%ROOT_DIR%" !IENV_ARGS! || exit /b 1
) else (
    echo [INFO] Kein --IEnvFile uebergeben, Env-Merge wird uebersprungen.
)

if exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
    set "VENV_PYTHON=%BACKEND_DIR%\.venv\Scripts\python.exe"
) else if exist "%BACKEND_DIR%\venv\Scripts\python.exe" (
    set "VENV_PYTHON=%BACKEND_DIR%\venv\Scripts\python.exe"
) else (
    call %PYTHON% -m venv "%BACKEND_DIR%\.venv" || (echo [FEHLER] Virtualenv konnte nicht erstellt werden. & exit /b 1)
    set "VENV_PYTHON=%BACKEND_DIR%\.venv\Scripts\python.exe"
)
call "%VENV_PYTHON%" -m pip install --upgrade pip || exit /b 1
call "%VENV_PYTHON%" -m pip install -r "%BACKEND_DIR%\requirements.txt" || exit /b 1

pushd "%FRONTEND_DIR%" || exit /b 1
call npm install --include=dev || (popd & exit /b 1)
popd

pushd "%MOBILE_DIR%" || exit /b 1
call npm install --include=dev || (popd & exit /b 1)
popd

call %PYTHON% "%ROOT_DIR%\scripts\check_env.py"
echo [OK] Installation abgeschlossen.
echo Backend starten:  .\scripts\start_win.ps1
exit /b 0
