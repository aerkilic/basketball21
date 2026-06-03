@echo off
rem Readme_Installation.bat
rem
rem Verwendung:
rem   .\scripts\install.bat
rem   .\scripts\install.bat --IEnvFile C:\daten\backend.env C:\daten\mobile.env
rem   .\scripts\install.bat --IEnvFile .\backend.env --IEnvFile .\mobile.env
rem
rem Ziel-Mapping fuer --IEnvFile:
rem   root      -> .env
rem   backend   -> backend/.env
rem   frontend  -> frontend/.env
rem   mobile    -> mobile/.env
rem   deploy    -> deploy/app.env
