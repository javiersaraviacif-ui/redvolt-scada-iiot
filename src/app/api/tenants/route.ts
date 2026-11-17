import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { ensureBackgroundTelemetryServices } from "@/lib/mqtt-service";

/**
 * GET /api/tenants
 * Retorna la jerarquía completa Cliente -> Proyecto / Instalación -> Tablero / Equipo.
 * Aplica aislamiento estricto por `tenant_id`:
 * - Si el usuario tiene rol CLIENT, filtra estrictamente por `where: { id: session.tenantId }`.
 * - Si el usuario es SUPER_ADMIN, retorna todos los clientes registrados.
 */
export async function GET() {
  ensureBackgroundTelemetryServices();
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const whereClause =
    session.role === "CLIENT" && session.tenantId
      ? { id: session.tenantId }
      : {};

  const tenants = await prisma.tenant.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
    include: {
      projects: {
        orderBy: { name: "asc" },
        include: {
          boards: {
            orderBy: { name: "asc" },
            include: {
              devices: true,
              _count: {
                select: {
                  alarms: { where: { status: "ACTIVE" } },
                  technicalDocuments: true,
                  maintenanceLogs: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    session,
    tenants,
  });
}

/**
 * POST /api/tenants
 * Permite al Super-Admin (Ingeniero Redvolt) crear nuevas empresas clientes, proyectos o dar de alta tableros con sensores estándar.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Operación exclusiva para Super-Admin (Ingeniero Redvolt)" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { entityType } = body;

  try {
    if (entityType === "TENANT") {
      const { name, rut, industry, contactEmail, phone, address } = body;
      const created = await prisma.tenant.create({
        data: {
          name: String(name).trim(),
          rut: String(rut).trim(),
          industry: String(industry || "Industria / Energía"),
          contactEmail: String(contactEmail).trim(),
          phone: String(phone || "+56 2 2000 0000"),
          address: String(address || "Chile"),
        },
      });
      return NextResponse.json({ ok: true, tenant: created });
    }

    if (entityType === "PROJECT") {
      const { tenantId, name, code, location, description } = body;
      const created = await prisma.project.create({
        data: {
          tenantId,
          name: String(name).trim(),
          code: String(code || `INST-${Date.now().toString().slice(-4)}`).trim(),
          location: String(location || "Sala Eléctrica Principal"),
          description: String(description || "Instalación eléctrica monitoreada por Redvolt IIoT"),
        },
      });
      return NextResponse.json({ ok: true, project: created });
    }

    if (entityType === "BOARD") {
      const {
        tenantId,
        projectId,
        name,
        code,
        normative,
        plcModel,
        gatewayModel,
        tariffClpPerKwh,
      } = body;

      const board = await prisma.board.create({
        data: {
          tenantId,
          projectId,
          name: String(name).trim(),
          code: String(code).trim(),
          normative: String(normative || "RIC N°02 / SEC"),
          plcModel: String(plcModel || "Siemens S7-1200 + Analizador PAC3220"),
          gatewayModel: String(gatewayModel || "CBOX IIoT Edge MQTT/REST"),
          tariffClpPerKwh: Number(tariffClpPerKwh || 150),
          energyAccumulatedKwh: 1250.0,
        },
      });

      const apiKey = `rv_live_${board.code.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;

      const device = await prisma.device.create({
        data: {
          boardId: board.id,
          name: `GW-${board.code}`,
          protocol: "MQTT + REST API",
          apiKey,
          mqttTopicPrefix: `${tenantId}/${projectId}/${board.id}/gw-${board.code.toLowerCase()}`,
          ipAddress: "10.24.20.100",
          firmware: "v4.8.2-industrial-lts",
        },
      });

      await prisma.sensorVariable.createMany({
        data: [
          {
            boardId: board.id,
            deviceId: device.id,
            code: "V_L1",
            name: "Voltaje Fase L1-N",
            unit: "V",
            category: "Tensión",
            dataType: "ANALOG",
            minNormal: 215,
            warnLow: 210,
            warnHigh: 232,
            critLow: 202,
            critHigh: 240,
            currentValue: 220.5,
          },
          {
            boardId: board.id,
            deviceId: device.id,
            code: "V_L2",
            name: "Voltaje Fase L2-N",
            unit: "V",
            category: "Tensión",
            dataType: "ANALOG",
            minNormal: 215,
            warnLow: 210,
            warnHigh: 232,
            critLow: 202,
            critHigh: 240,
            currentValue: 221.1,
          },
          {
            boardId: board.id,
            deviceId: device.id,
            code: "V_L3",
            name: "Voltaje Fase L3-N",
            unit: "V",
            category: "Tensión",
            dataType: "ANALOG",
            minNormal: 215,
            warnLow: 210,
            warnHigh: 232,
            critLow: 202,
            critHigh: 240,
            currentValue: 219.9,
          },
          {
            boardId: board.id,
            deviceId: device.id,
            code: "I_L1",
            name: "Corriente Línea L1",
            unit: "A",
            category: "Corriente",
            dataType: "ANALOG",
            minNormal: 10,
            warnLow: 5,
            warnHigh: 90,
            critLow: 0,
            critHigh: 110,
            currentValue: 48.2,
          },
          {
            boardId: board.id,
            deviceId: device.id,
            code: "I_L2",
            name: "Corriente Línea L2",
            unit: "A",
            category: "Corriente",
            dataType: "ANALOG",
            minNormal: 10,
            warnLow: 5,
            warnHigh: 90,
            critLow: 0,
            critHigh: 110,
            currentValue: 46.8,
          },
          {
            boardId: board.id,
            deviceId: device.id,
            code: "I_L3",
            name: "Corriente Línea L3",
            unit: "A",
            category: "Corriente",
            dataType: "ANALOG",
            minNormal: 10,
            warnLow: 5,
            warnHigh: 90,
            critLow: 0,
            critHigh: 110,
            currentValue: 49.1,
          },
          {
            boardId: board.id,
            deviceId: device.id,
            code: "FREQ",
            name: "Frecuencia de Red",
            unit: "Hz",
            category: "Calidad de Energía",
            dataType: "ANALOG",
            minNormal: 49.8,
            warnLow: 49.5,
            warnHigh: 50.5,
            critLow: 49.0,
            critHigh: 51.0,
            currentValue: 50.0,
          },
          {
            boardId: board.id,
            deviceId: device.id,
            code: "PF",
            name: "Factor de Potencia (Cos φ)",
            unit: "pu",
            category: "Calidad de Energía",
            dataType: "ANALOG",
            minNormal: 0.93,
            warnLow: 0.9,
            warnHigh: 1.0,
            critLow: 0.85,
            critHigh: 1.0,
            currentValue: 0.96,
          },
          {
            boardId: board.id,
            deviceId: device.id,
            code: "TEMP_BARRAS",
            name: "Temperatura Barras Cobre",
            unit: "°C",
            category: "Térmico",
            dataType: "ANALOG",
            minNormal: 25,
            warnLow: 15,
            warnHigh: 58,
            critLow: 5,
            critHigh: 70,
            currentValue: 36.5,
          },
          {
            boardId: board.id,
            deviceId: device.id,
            code: "DI_MAIN_BREAKER",
            name: "Interruptor General (52G)",
            unit: "BOOL",
            category: "Estado Digital",
            dataType: "DIGITAL",
            currentValue: 1,
          },
          {
            boardId: board.id,
            deviceId: device.id,
            code: "DI_CONTACTOR_K1",
            name: "Contactor Barra Crítica (K1)",
            unit: "BOOL",
            category: "Estado Digital",
            dataType: "DIGITAL",
            currentValue: 1,
          },
          {
            boardId: board.id,
            deviceId: device.id,
            code: "DI_PHASE_FAULT",
            name: "Relé Falla de Fase / Asimetría (47)",
            unit: "BOOL",
            category: "Estado Digital",
            dataType: "DIGITAL",
            currentValue: 0,
          },
          {
            boardId: board.id,
            deviceId: device.id,
            code: "DI_GEN_ONLINE",
            name: "Grupo Electrógeno en Línea",
            unit: "BOOL",
            category: "Estado Digital",
            dataType: "DIGITAL",
            currentValue: 0,
          },
          {
            boardId: board.id,
            deviceId: device.id,
            code: "DI_AUTO_MODE",
            name: "Selector PLC Auto / Manual",
            unit: "BOOL",
            category: "Estado Digital",
            currentValue: 1,
          },
        ],
      });

      await prisma.virtualVariable.createMany({
        data: [
          {
            boardId: board.id,
            code: "S_TOTAL_KVA",
            name: "Potencia Aparente Trifásica (S)",
            formula: "(V_L1*I_L1 + V_L2*I_L2 + V_L3*I_L3) / 1000",
            unit: "kVA",
            description: "Suma vectorial de potencia aparente en las 3 fases",
            currentValue: 31.8,
          },
          {
            boardId: board.id,
            code: "V_UNBALANCE_PCT",
            name: "Desbalance de Tensión (NEMA MG1)",
            formula: "MAX(|V_i - V_avg|) / V_avg * 100",
            unit: "%",
            description: "Desviación máxima entre fases y promedio trifásico",
            currentValue: 0.42,
          },
          {
            boardId: board.id,
            code: "ENERGY_KWH",
            name: "Energía Activa Acumulada",
            formula: "∫ (S_TOTAL_KVA * PF) dt",
            unit: "kWh",
            description: "Integración de potencia activa consumida",
            currentValue: 1250.0,
          },
          {
            boardId: board.id,
            code: "COST_CLP",
            name: "Costo Operacional Acumulado",
            formula: "ENERGY_KWH * Tarifa_CLP_kWh",
            unit: "CLP",
            description: "Valorización económica del consumo eléctrico",
            currentValue: Math.round(1250 * Number(tariffClpPerKwh || 150)),
          },
        ],
      });

      await prisma.hourMeter.create({
        data: {
          boardId: board.id,
          equipmentName: `Interruptor General & Celda ${board.code}`,
          code: `HM-${board.code}`,
          accumulatedHours: 420.0,
          maintenanceTargetHours: 2500.0,
          warningHoursThreshold: 2100.0,
          triggerVariableCode: "I_L1",
          triggerThreshold: 5.0,
          isRunning: true,
        },
      });

      return NextResponse.json({ ok: true, board });
    }

    return NextResponse.json({ error: "Tipo de entidad no soportado" }, { status: 400 });
  } catch (err) {
    console.error("[Tenants POST Error]:", err);
    return NextResponse.json({ error: "Error al crear registro en base de datos" }, { status: 500 });
  }
}
