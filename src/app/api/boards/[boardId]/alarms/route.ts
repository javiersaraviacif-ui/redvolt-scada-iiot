import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeBoardAccess } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await context.params;
  const auth = await authorizeBoardAccess(boardId);
  if (auth.error || !auth.board) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const alarms = await prisma.alarmEvent.findMany({
    where: { boardId, tenantId: auth.board.tenantId },
    orderBy: { triggeredAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ alarms });
}

/**
 * POST /api/boards/[boardId]/alarms
 * Permite reconocer (ACK) una alarma registrando el usuario que ejecutó el reconocimiento,
 * o simular una perturbación eléctrica de prueba para verificar el motor de alarmas.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await context.params;
  const auth = await authorizeBoardAccess(boardId);
  if (auth.error || !auth.board || !auth.session) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();

  if (body.action === "ACK" && body.alarmId) {
    const alarm = await prisma.alarmEvent.findUnique({
      where: { id: String(body.alarmId) },
    });

    if (!alarm || alarm.boardId !== boardId) {
      return NextResponse.json({ error: "Alarma no encontrada en este tablero" }, { status: 404 });
    }

    const updated = await prisma.alarmEvent.update({
      where: { id: alarm.id },
      data: {
        status: "ACKNOWLEDGED",
        ackedAt: new Date(),
        ackedByUserId: auth.session.userId,
        ackedByName: `${auth.session.fullName} (${auth.session.email})`,
      },
    });

    return NextResponse.json({ ok: true, alarm: updated });
  }

  if (body.action === "TRIGGER_TEST") {
    const created = await prisma.alarmEvent.create({
      data: {
        tenantId: auth.board.tenantId,
        boardId,
        variableCode: body.variableCode || "V_L1",
        variableName: body.variableName || "Voltaje Fase L1-N",
        severity: body.severity || "CRITICAL",
        message:
          body.message ||
          "Alarma de prueba generada desde Consola SCADA: Sobretensión Fase L1 (242.8 V >= 240.0 V)",
        measuredValue: Number(body.measuredValue || 242.8),
        thresholdValue: Number(body.thresholdValue || 240.0),
        unit: body.unit || "V",
        status: "ACTIVE",
      },
    });
    return NextResponse.json({ ok: true, alarm: created });
  }

  return NextResponse.json({ error: "Acción de alarma inválida" }, { status: 400 });
}
