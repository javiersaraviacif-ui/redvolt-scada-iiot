import mqtt, { MqttClient } from "mqtt";
import { prisma } from "./prisma";
import { processTelemetryPacket } from "./telemetry-engine";

/**
 * Servicio de Ingesta Multi-Protocolo MQTT + Simulador en Tiempo Real Integrado.
 * Tópico estandarizado: `tenant_id/proyecto_id/tablero_id/dispositivo_id/variable`
 * También soporta payload JSON agrupado en `tenant_id/proyecto_id/tablero_id/dispositivo_id/telemetry`.
 */

interface GlobalTelemetryState {
  simulatorInterval?: NodeJS.Timeout;
  mqttClient?: MqttClient;
  lastMqttMessage?: {
    topic: string;
    payload: string;
    receivedAt: string;
  };
  tickCount: number;
}

const globalState = globalThis as unknown as {
  __redvoltTelemetry?: GlobalTelemetryState;
};

if (!globalState.__redvoltTelemetry) {
  globalState.__redvoltTelemetry = {
    tickCount: 0,
  };
}

export function getTelemetryRuntimeStatus() {
  const st = globalState.__redvoltTelemetry!;
  return {
    simulatorActive: Boolean(st.simulatorInterval),
    mqttConnected: Boolean(st.mqttClient?.connected),
    lastMqttMessage: st.lastMqttMessage ?? null,
    tickCount: st.tickCount,
  };
}

/**
 * Procesa un mensaje MQTT recibido en el formato estandarizado:
 * `tenant_id/proyecto_id/tablero_id/dispositivo_id/variable`
 */
export async function handleMqttTopicMessage(topic: string, messageBuffer: Buffer | string) {
  const raw = typeof messageBuffer === "string" ? messageBuffer : messageBuffer.toString("utf8");
  const parts = topic.split("/");
  if (parts.length < 5) {
    throw new Error(
      `Tópico MQTT inválido (${topic}). Formato requerido: tenant_id/proyecto_id/tablero_id/dispositivo_id/variable`
    );
  }

  const [tenantId, , boardId, , variableOrChannel] = parts;
  globalState.__redvoltTelemetry!.lastMqttMessage = {
    topic,
    payload: raw,
    receivedAt: new Date().toISOString(),
  };

  let metrics: Record<string, number> = {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number") {
      metrics[variableOrChannel] = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      if (typeof parsed.value === "number") {
        metrics[variableOrChannel] = parsed.value;
      } else {
        metrics = parsed;
      }
    }
  } catch {
    const num = parseFloat(raw);
    if (!Number.isNaN(num)) {
      metrics[variableOrChannel] = num;
    }
  }

  return processTelemetryPacket({
    tenantId,
    boardId,
    metrics,
    latencyMs: Math.floor(11 + Math.random() * 9),
    sourceProtocol: "MQTT",
  });
}

/**
 * Ejecuta un ciclo del Simulador en Tiempo Real (cada 3 segundos) para los tableros activos,
 * especialmente "Hospital Clínico Regional — Tablero General Quirófanos".
 */
export async function runSimulatorTick() {
  const st = globalState.__redvoltTelemetry!;
  st.tickCount += 1;
  const tick = st.tickCount;

  try {
    const boards = await prisma.board.findMany({
      include: { devices: true },
    });

    for (const board of boards) {
      const isQuirofanos = board.id === "board-quirofanos-01";
      const isSubestacion = board.id === "board-tta-grupos-02";
      const baseCurrent = isQuirofanos ? 65.0 : isSubestacion ? 185.0 : 240.0;

      const wave = Math.sin(tick / 4);
      const v1 = +(221.2 + wave * 1.9 + (Math.random() - 0.5) * 1.1).toFixed(2);
      const v2 = +(219.7 - wave * 1.5 + (Math.random() - 0.5) * 1.1).toFixed(2);
      const v3 = +(222.5 + Math.cos(tick / 5) * 1.7 + (Math.random() - 0.5) * 1.1).toFixed(2);

      const i1 = +(baseCurrent + wave * (baseCurrent * 0.08) + (Math.random() - 0.5) * 2.4).toFixed(2);
      const i2 = +(baseCurrent * 0.96 + wave * (baseCurrent * 0.07) + (Math.random() - 0.5) * 2.1).toFixed(2);
      const i3 = +(baseCurrent * 1.03 + wave * (baseCurrent * 0.08) + (Math.random() - 0.5) * 2.5).toFixed(2);

      const freq = +(50.0 + Math.sin(tick / 7) * 0.05 + (Math.random() - 0.5) * 0.02).toFixed(2);
      const pf = +(0.95 + Math.cos(tick / 9) * 0.02).toFixed(2);
      const temp = +(38.2 + Math.sin(tick / 10) * 1.8 + (Math.random() - 0.5) * 0.4).toFixed(1);

      const devId = board.devices[0]?.id || "dev-cbox-quirofanos";
      const sampleTopic = `${board.tenantId}/${board.projectId}/${board.id}/${devId}/V_L1`;

      st.lastMqttMessage = {
        topic: sampleTopic,
        payload: JSON.stringify({ V_L1: v1, V_L2: v2, V_L3: v3, I_L1: i1, I_L2: i2, I_L3: i3, FREQ: freq }),
        receivedAt: new Date().toISOString(),
      };

      await processTelemetryPacket({
        tenantId: board.tenantId,
        boardId: board.id,
        latencyMs: Math.floor(12 + Math.random() * 10),
        sourceProtocol: "SIMULATOR",
        metrics: {
          V_L1: v1,
          V_L2: v2,
          V_L3: v3,
          I_L1: i1,
          I_L2: i2,
          I_L3: i3,
          FREQ: freq,
          PF: pf,
          TEMP_BARRAS: temp,
        },
      });
    }
  } catch (err) {
    console.error("[Redvolt Simulator Tick Error]:", err);
  }
}

/**
 * Inicia automáticamente el worker de simulación cada 3 segundos y el cliente MQTT (`mqtt.js`).
 */
export function ensureBackgroundTelemetryServices() {
  const st = globalState.__redvoltTelemetry!;

  if (!st.simulatorInterval) {
    st.simulatorInterval = setInterval(() => {
      void runSimulatorTick();
    }, 3000);
  }

  if (!st.mqttClient && process.env.MQTT_BROKER_URL) {
    try {
      const client = mqtt.connect(process.env.MQTT_BROKER_URL, {
        reconnectPeriod: 15000,
        connectTimeout: 4000,
        clientId: `redvolt-scada-ingestor-${Math.random().toString(16).slice(2, 8)}`,
      });

      client.on("connect", () => {
        // Suscripción al tópico estándar: tenant_id/proyecto_id/tablero_id/dispositivo_id/variable
        client.subscribe("+/+/+/+/+", (err) => {
          if (!err) {
            console.log("📡 [Redvolt MQTT] Suscrito a tópicos industriales +/+/+/+/+");
          }
        });
      });

      client.on("message", (topic, payload) => {
        void handleMqttTopicMessage(topic, payload).catch((e) =>
          console.error("[Redvolt MQTT Ingest Error]:", e)
        );
      });

      client.on("error", () => {
        // Si no hay broker externo en el puerto 1883, el puente interno MQTT/REST sigue operando sin interrumpir
      });

      st.mqttClient = client;
    } catch {
      // Fallback silencioso a puente interno
    }
  }
}
