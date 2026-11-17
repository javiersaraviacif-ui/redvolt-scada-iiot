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

  const logs = await prisma.maintenanceLog.findMany({
    where: { boardId, tenantId: auth.board.tenantId },
    orderBy: { performedAt: "desc" },
  });

  return NextResponse.json({ logs });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await context.params;
  const auth = await authorizeBoardAccess(boardId);
  if (auth.error || !auth.board) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const { performedAt, technicianName, maintenanceType, details } = body;

  if (!technicianName || !maintenanceType || !details) {
    return NextResponse.json(
      { error: "Complete técnico responsable, tipo de mantención y detalle técnico." },
      { status: 400 }
    );
  }

  const log = await prisma.maintenanceLog.create({
    data: {
      tenantId: auth.board.tenantId,
      boardId,
      performedAt: performedAt ? new Date(performedAt) : new Date(),
      technicianName: String(technicianName).trim(),
      maintenanceType,
      details: String(details).trim(),
    },
  });

  return NextResponse.json({ ok: true, log });
}
