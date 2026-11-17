import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processTelemetryPacket } from "@/lib/telemetry-engine";
import { handleMqttTopicMessage } from "@/lib/mqtt-service";

/**
 * POST /api/telemetry/ingest
 * Endpoint de Ingesta Multi-Protocolo:
 * 1. Soporta ingesta vía API REST con header `x-api-key` (compatible con Gateways CBOX, Node-RED, LoRaWAN, ESP32/SCT-013).
 * 2. Soporta puente de tópico MQTT estandarizado `tenant_id/proyecto_id/tablero_id/dispositivo_id/variable`.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = req.headers.get("x-api-key") || body.apiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta header de autenticación de dispositivo 'x-api-key'" },
        { status: 401 }
      );
    }

    const device = await prisma.device.findUnique({
      where: { apiKey: String(apiKey) },
      include: { board: true },
    });

    if (!device) {
      return NextResponse.json(
        { error: "API Key de dispositivo inválida o no registrada en Redvolt IIoT" },
        { status: 403 }
      );
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });

    // Si envía un tópico MQTT explícito (`tenant_id/proyecto_id/tablero_id/dispositivo_id/variable`)
    if (body.mqttTopic) {
      const result = await handleMqttTopicMessage(
        String(body.mqttTopic),
        JSON.stringify(body.payload ?? body.metrics ?? body.value ?? {})
      );
      return NextResponse.json({
        ok: true,
        protocol: "MQTT_TOPIC_BRIDGE",
        device: device.name,
        topic: body.mqttTopic,
        result,
      });
    }

    // Ingesta REST JSON estándar
    const metrics: Record<string, number> = body.metrics || {};
    if (body.variable && body.value !== undefined) {
      metrics[String(body.variable)] = Number(body.value);
    }

    const result = await processTelemetryPacket({
      tenantId: device.board.tenantId,
      boardId: device.boardId,
      latencyMs: Number(body.latencyMs || 14),
      metrics,
      sourceProtocol: "REST_API",
    });

    return NextResponse.json({
      ok: true,
      protocol: "REST_API_JSON",
      device: device.name,
      result,
    });
  } catch (error) {
    console.error("[Telemetry Ingest Error]:", error);
    return NextResponse.json(
      { error: "Error procesando payload de telemetría industrial" },
      { status: 500 }
    );
  }
}
