import { prisma } from "./prisma";

export interface TelemetryPayloadInput {
  boardId: string;
  tenantId: string;
  latencyMs?: number;
  metrics: Record<string, number>;
  sourceProtocol?: "MQTT" | "REST_API" | "SIMULATOR";
}

/**
 * Procesa un paquete de telemetría entrante (desde MQTT, API REST o Simulador):
 * 1. Actualiza los valores actuales de cada SensorVariable.
 * 2. Almacena las series de tiempo en TelemetryReading.
 * 3. Evalúa umbrales (Normal / Advertencia / Crítico) y dispara AlarmEvent si corresponde.
 * 4. Calcula y actualiza las Variables Virtuales (Potencia Aparente S, Desbalance V%, Energía kWh, Costo CLP).
 * 5. Avanza los Horómetros Virtuales cuando la corriente o variable de disparo supera el umbral activo.
 * 6. Actualiza el Watchdog / Heartbeat y latencia del Tablero.
 */
export async function processTelemetryPacket(input: TelemetryPayloadInput) {
  const { boardId, tenantId, metrics, latencyMs = 15 } = input;
  const now = new Date();

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      sensorVariables: true,
      virtualVariables: true,
      hourMeters: true,
    },
  });

  if (!board || board.tenantId !== tenantId) {
    throw new Error("Tablero inválido o violación de tenant_id en ingesta");
  }

  const varMap = new Map<string, number>();
  for (const sv of board.sensorVariables) {
    varMap.set(sv.code, sv.currentValue);
  }

  const readingsToInsert: {
    tenantId: string;
    boardId: string;
    variableCode: string;
    value: number;
    timestamp: Date;
  }[] = [];

  for (const [code, rawVal] of Object.entries(metrics)) {
    const val = Number(rawVal);
    if (Number.isNaN(val)) continue;
    varMap.set(code, val);

    const sensor = board.sensorVariables.find((s) => s.code === code);
    if (sensor) {
      await prisma.sensorVariable.update({
        where: { id: sensor.id },
        data: { currentValue: val, updatedAt: now },
      });

      if (sensor.dataType === "ANALOG") {
        readingsToInsert.push({
          tenantId,
          boardId,
          variableCode: code,
          value: val,
          timestamp: now,
        });

        // Evaluar umbrales de alarma
        let severity: "CRITICAL" | "WARNING" | null = null;
        let thresholdHit = 0;
        let msg = "";

        if (sensor.critHigh !== null && val >= sensor.critHigh) {
          severity = "CRITICAL";
          thresholdHit = sensor.critHigh;
          msg = `${sensor.name} superó límite CRÍTICO superior (${val.toFixed(1)} ${sensor.unit} >= ${sensor.critHigh} ${sensor.unit})`;
        } else if (sensor.critLow !== null && val <= sensor.critLow && sensor.critLow > 0) {
          severity = "CRITICAL";
          thresholdHit = sensor.critLow;
          msg = `${sensor.name} cayó bajo límite CRÍTICO inferior (${val.toFixed(1)} ${sensor.unit} <= ${sensor.critLow} ${sensor.unit})`;
        } else if (sensor.warnHigh !== null && val >= sensor.warnHigh) {
          severity = "WARNING";
          thresholdHit = sensor.warnHigh;
          msg = `${sensor.name} en zona de ADVERTENCIA alta (${val.toFixed(1)} ${sensor.unit} >= ${sensor.warnHigh} ${sensor.unit})`;
        } else if (sensor.warnLow !== null && val <= sensor.warnLow && sensor.warnLow > 0) {
          severity = "WARNING";
          thresholdHit = sensor.warnLow;
          msg = `${sensor.name} en zona de ADVERTENCIA baja (${val.toFixed(1)} ${sensor.unit} <= ${sensor.warnLow} ${sensor.unit})`;
        }

        if (severity) {
          // Evitar duplicar alarmas activas idénticas en los últimos 3 minutos
          const recentActive = await prisma.alarmEvent.findFirst({
            where: {
              boardId,
              variableCode: code,
              status: "ACTIVE",
              triggeredAt: { gte: new Date(now.getTime() - 3 * 60 * 1000) },
            },
          });

          if (!recentActive) {
            await prisma.alarmEvent.create({
              data: {
                tenantId,
                boardId,
                variableCode: code,
                variableName: sensor.name,
                severity,
                message: msg,
                measuredValue: val,
                thresholdValue: thresholdHit,
                unit: sensor.unit,
                status: "ACTIVE",
                triggeredAt: now,
              },
            });
          }
        }
      }
    }
  }

  if (readingsToInsert.length > 0) {
    await prisma.telemetryReading.createMany({ data: readingsToInsert });
  }

  // Motor de Variables Virtuales y Cálculos
  const v1 = varMap.get("V_L1") ?? 220;
  const v2 = varMap.get("V_L2") ?? 220;
  const v3 = varMap.get("V_L3") ?? 220;
  const i1 = varMap.get("I_L1") ?? 0;
  const i2 = varMap.get("I_L2") ?? 0;
  const i3 = varMap.get("I_L3") ?? 0;
  const pf = varMap.get("PF") ?? 0.95;

  // 1. Potencia Aparente Trifásica S (kVA) = (V1*I1 + V2*I2 + V3*I3) / 1000
  const sTotalKva = +(((v1 * i1 + v2 * i2 + v3 * i3) / 1000)).toFixed(2);

  // 2. Desbalance de Tensión (%) = MAX(|Vi - Vavg|) / Vavg * 100
  const vAvg = (v1 + v2 + v3) / 3;
  const maxDev = Math.max(Math.abs(v1 - vAvg), Math.abs(v2 - vAvg), Math.abs(v3 - vAvg));
  const vUnbalancePct = vAvg > 0 ? +((maxDev / vAvg) * 100).toFixed(2) : 0;

  // 3. Incremento de Energía Activa Acumulada (kWh) por intervalo
  // En simulación acelerada o tiempo real sumamos el diferencial proporcional
  const deltaHours = 3 / 3600; // cada 3s reales equivale a 1/1200 h, aplicamos factor demostrativo suave para ver avance en vivo
  const activePowerKw = sTotalKva * pf;
  const energyDeltaKwh = +(activePowerKw * deltaHours * 4).toFixed(3);
  const newEnergyKwh = +(board.energyAccumulatedKwh + energyDeltaKwh).toFixed(2);
  const newCostClp = Math.round(newEnergyKwh * board.tariffClpPerKwh);

  const virtualUpdates: Record<string, number> = {
    S_TOTAL_KVA: sTotalKva,
    V_UNBALANCE_PCT: vUnbalancePct,
    ENERGY_KWH: newEnergyKwh,
    COST_CLP: newCostClp,
  };

  for (const vv of board.virtualVariables) {
    if (virtualUpdates[vv.code] !== undefined) {
      await prisma.virtualVariable.update({
        where: { id: vv.id },
        data: {
          currentValue: virtualUpdates[vv.code],
          updatedAt: now,
        },
      });
    }
  }

  // 4. Mantenimiento Predictivo y Horómetros Virtuales
  for (const hm of board.hourMeters) {
    const triggerVal = varMap.get(hm.triggerVariableCode) ?? 0;
    const isActive = triggerVal >= hm.triggerThreshold;
    if (isActive) {
      // Incrementa en vivo (0.02 hrs por pulso para que el ingeniero vea el avance del contador en el dashboard)
      const nextHours = +(hm.accumulatedHours + 0.02).toFixed(2);
      await prisma.hourMeter.update({
        where: { id: hm.id },
        data: {
          accumulatedHours: nextHours,
          isRunning: true,
          lastIncrementAt: now,
        },
      });
    } else {
      await prisma.hourMeter.update({
        where: { id: hm.id },
        data: { isRunning: false },
      });
    }
  }

  // 5. Actualizar Watchdog / Heartbeat y Energía del Tablero
  await prisma.board.update({
    where: { id: boardId },
    data: {
      lastHeartbeat: now,
      latencyMs,
      gatewayStatus: "ONLINE",
      energyAccumulatedKwh: newEnergyKwh,
    },
  });

  return {
    boardId,
    timestamp: now.toISOString(),
    latencyMs,
    virtuals: virtualUpdates,
  };
}
