@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado.
  echo Instale o Node.js LTS e execute este arquivo novamente.
  pause
  exit /b 1
)
echo Iniciando Brasileirão Manager Online...
node server.js
pause
