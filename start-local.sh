#!/usr/bin/env bash
set -e

echo "=================================================================="
echo "⚡ REDVOLT SCADA / IIoT — INICIALIZADOR LOCAL (LINUX / MAC)"
echo "=================================================================="

# 1. Crear archivo .env si no existe
if [ ! -f .env ]; then
  echo "📄 Creando archivo .env desde .env.example..."
  cp .env.example .env
fi

# 2. Verificar si el puerto 5432 (PostgreSQL) está activo; si no, intentar levantarlo con Docker
if ! nc -z 127.0.0.1 5432 2>/dev/null; then
  if command -v docker >/dev/null 2>&1; then
    echo "🐘 Levantando contenedor PostgreSQL 15 (redvolt_db) en puerto 5432..."
    docker compose up -d postgres || docker run --name redvolt-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=redvolt_db -p 5432:5432 -d postgres:15-alpine || true
    echo "⏳ Esperando a que PostgreSQL acepte conexiones..."
    sleep 4
  else
    echo "⚠️  Asegúrate de tener PostgreSQL corriendo en 127.0.0.1:5432 (base de datos: redvolt_db) y configura DATABASE_URL en .env"
  fi
fi

# 3. Instalar dependencias de Node.js
echo "📦 Instalando dependencias npm..."
npm install

# 4. Generar cliente Prisma, crear tablas y poblar datos de demostración
echo "🗄️  Sincronizando esquema PostgreSQL + Prisma y cargando datos demo (Hospital Clínico Regional)..."
npx prisma generate
npx prisma db push
npm run seed

# 5. Iniciar servidor Next.js + Simulador en Tiempo Real (cada 3s)
echo "🚀 Iniciando Redvolt en http://localhost:3000 ..."
npm run dev
