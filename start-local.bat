@echo off
title Redvolt SCADA / IIoT - Inicializador Local Windows
echo ==================================================================
echo  REDVOLT SCADA / IIoT - INICIALIZADOR LOCAL (WINDOWS)
echo ==================================================================

if not exist .env (
    echo [1/4] Creando archivo .env desde .env.example...
    copy .env.example .env
)

where docker >nul 2>nul
if %errorlevel%==0 (
    echo [2/4] Verificando contenedor PostgreSQL 15 en Docker...
    docker compose up -d postgres
    timeout /t 4 /nobreak >nul
)

echo [3/4] Instalando dependencias npm y configurando base de datos PostgreSQL...
call npm install
call npx prisma generate
call npx prisma db push
call npm run seed

echo [4/4] Iniciando servidor Redvolt en http://localhost:3000 ...
start http://localhost:3000
call npm run dev
pause
