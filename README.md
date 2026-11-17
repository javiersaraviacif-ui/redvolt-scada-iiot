# Redvolt — Ingeniería Eléctrica, Automatización y Telemetría IIoT (SaaS B2B)

Plataforma Full-Stack SaaS B2B de **Monitoreo Crítico SCADA/IIoT 24/7**, Gestión de Activos Eléctricos (Normativa RIC/SEC Chile), Mantenimiento Predictivo y Portal Corporativo para **Redvolt Ingeniería S.A.**

---

## Stack Tecnológico

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, Recharts (series de tiempo multifase con zoom interactivo), Lucide Icons.
- **Backend & Ingesta Multi-Protocolo**: Next.js Route Handlers (Node.js) con soporte simultáneo para suscripción **MQTT (`mqtt.js`)** en tópicos estandarizados (`tenant_id/proyecto_id/tablero_id/dispositivo_id/variable`) y **API REST (`POST /api/telemetry/ingest`)** autenticada con `x-api-key` por dispositivo.
- **Base de Datos**: **PostgreSQL** + **Prisma ORM** con aislamiento estricto Multi-Tenant (`tenant_id`) e índices compuestos para series de tiempo (`TelemetryReading`).
- **Generación de Documentos**: Exportación nativa de **Reportes Ejecutivos en PDF** (`jspdf` + `jspdf-autotable`) con membrete corporativo Redvolt y exportación de series históricas a **CSV**.

---

## Ejecución Rápida en Entorno Local

### 1. Requisitos Previos
- **Node.js** 20+ (o 24 LTS)
- **PostgreSQL** 14+ corriendo localmente (o en Docker / nube)

### 2. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto (puedes basarte en `.env.example`):

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/redvolt_db?schema=public"
MQTT_BROKER_URL="mqtt://127.0.0.1:1883"
SESSION_SECRET="redvolt-scada-iiot-enterprise-secret-2026"
```

*(Si prefieres levantar PostgreSQL rápidamente con Docker)*:
```bash
docker run --name redvolt-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=redvolt_db -p 5432:5432 -d postgres:15
```

### 3. Instalar Dependencias, Sincronizar Base de Datos y Cargar Datos Demo
```bash
npm install
npx prisma generate
npx prisma db push
npm run seed
```

### 4. Iniciar el Servidor de Desarrollo (incluye Simulador en Tiempo Real cada 3s)
```bash
npm run dev
```

Abre en tu navegador: **`http://localhost:3000`**

---

## Credenciales de Demostración (Multi-Tenant RBAC)

En la pantalla de login (`/login`) puedes cargar cualquiera de estas cuentas con un solo clic:

| Rol | Institución (`tenant_id`) | Correo | Contraseña | Alcance de Permisos |
| :--- | :--- | :--- | :--- | :--- |
| **Cliente Demo Principal** | **Hospital Clínico Regional** | `operaciones@hospitalregional.cl` | `Hospital2026!` | Aislamiento estricto: accede solo a *Edificio Quirófanos (`TDF-QUIR-01`)* y *Subestación Principal*. |
| **Super-Admin (Ingeniero Redvolt)** | **Redvolt Ingeniería Central** | `admin@redvolt.cl` | `Redvolt2026!` | Control total CRUD de empresas clientes, proyectos, tableros, variables virtuales, planos y bitácoras. |
| **Cliente Demo Secundario** | **Compañía Minera & Procesos del Pacífico S.A.** | `mantenimiento.electrico@minerapacifico.cl` | `Minera2026!` | Aislamiento estricto: accede solo a *Estación de Bombeo e Impulsión N°4 (`CCM-EB04-01`)*. |
