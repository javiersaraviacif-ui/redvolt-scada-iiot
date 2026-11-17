import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeBoardAccess } from "@/lib/auth";
import { ensureBackgroundTelemetryServices, getTelemetryRuntimeStatus } from "@/lib/mqtt-service";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ boardId: string }> }
) {
  ensureBackgroundTelemetryServices();
  const { boardId } = await context.params;
  const auth = await authorizeBoardAccess(boardId);
  if (auth.error || !auth.board) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const fullBoard = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      tenant: true,
      project: true,
      devices: true,
      sensorVariables: {
        orderBy: { code: "asc" },
      },
      virtualVariables: {
        orderBy: { code: "asc" },
      },
      hourMeters: {
        orderBy: { code: "asc" },
      },
      alarms: {
        orderBy: { triggeredAt: "desc" },
        take: 30,
      },
      technicalDocuments: {
        orderBy: { uploadedAt: "desc" },
      },
      maintenanceLogs: {
        orderBy: { performedAt: "desc" },
      },
    },
  });

  if (!fullBoard) {
    return NextResponse.json({ error: "Tablero no encontrado" }, { status: 404 });
  }

  // Evaluar estado Online/Offline según antigüedad del último heartbeat (< 30 segundos = ONLINE)
  const secondsSinceHeartbeat = Math.round(
    (Date.now() - new Date(fullBoard.lastHeartbeat).getTime()) / 1000
  );
  const effectiveGatewayStatus =
    secondsSinceHeartbeat <= 30 ? "ONLINE" : "OFFLINE";

  return NextResponse.json({
    board: {
      ...fullBoard,
      effectiveGatewayStatus,
      secondsSinceHeartbeat,
    },
    runtime: getTelemetryRuntimeStatus(),
  });
}

/**
 * PATCH /api/boards/[boardId]
 * Actualiza el estado operativo del tablero (`OPERATIVO`, `EN_MANTENCION`, `FUERA_DE_SERVICIO`),
 * estado de interruptores digitales (Auto/Manual, Grupo Electrógeno, etc.) o umbrales de sensores.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await context.params;
  const auth = await authorizeBoardAccess(boardId);
  if (auth.error || !auth.board) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();

  if (body.operationalStatus) {
    const updated = await prisma.board.update({
      where: { id: boardId },
      data: { operationalStatus: body.operationalStatus },
    });
    return NextResponse.json({ ok: true, board: updated });
  }

  if (body.toggleDigitalCode) {
    const sensor = await prisma.sensorVariable.findUnique({
      where: {
        boardId_code: {
          boardId,
          code: String(body.toggleDigitalCode),
        },
      },
    });
    if (!sensor) {
      return NextResponse.json({ error: "Variable digital no encontrada" }, { status: 404 });
    }
    const nextVal = sensor.currentValue >= 0.5 ? 0 : 1;
    const updated = await prisma.sensorVariable.update({
      where: { id: sensor.id },
      data: { currentValue: nextVal, updatedAt: new Date() },
    });
    return NextResponse.json({ ok: true, sensor: updated });
  }

  if (body.updateThreshold && auth.session.role === "SUPER_ADMIN") {
    const { sensorId, warnLow, warnHigh, critLow, critHigh } = body.updateThreshold;
    const updated = await prisma.sensorVariable.update({
      where: { id: sensorId },
      data: {
        warnLow: warnLow !== undefined && warnLow !== "" ? Number(warnLow) : null,
        warnHigh: warnHigh !== undefined && warnHigh !== "" ? Number(warnHigh) : null,
        critLow: critLow !== undefined && critLow !== "" ? Number(critLow) : null,
        critHigh: critHigh !== undefined && critHigh !== "" ? Number(critHigh) : null,
      },
    });
    return NextResponse.json({ ok: true, sensor: updated });
  }

  if (body.createVirtualVariable && auth.session.role === "SUPER_ADMIN") {
    const { code, name, formula, unit, description, currentValue } = body.createVirtualVariable;
    const created = await prisma.virtualVariable.upsert({
      where: {
        boardId_code: {
          boardId,
          code: String(code).trim().toUpperCase(),
        },
      },
      update: {
        name: String(name).trim(),
        formula: String(formula).trim(),
        unit: String(unit).trim(),
        description: String(description || "").trim(),
        currentValue: Number(currentValue || 0),
      },
      create: {
        boardId,
        code: String(code).trim().toUpperCase(),
        name: String(name).trim(),
        formula: String(formula).trim(),
        unit: String(unit).trim(),
        description: String(description || "").trim(),
        currentValue: Number(currentValue || 0),
      },
    });
    return NextResponse.json({ ok: true, virtualVariable: created });
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
}
