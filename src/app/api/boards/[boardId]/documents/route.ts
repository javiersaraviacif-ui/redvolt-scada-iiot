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

  const documents = await prisma.technicalDocument.findMany({
    where: { boardId, tenantId: auth.board.tenantId },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({ documents });
}

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
  const { title, category, code, version, fileSize, summary, fileUrl } = body;

  if (!title || !category) {
    return NextResponse.json(
      { error: "Título y categoría del documento técnico son obligatorios" },
      { status: 400 }
    );
  }

  const docCode =
    code || `DOC-RV-${auth.board.code}-${Math.floor(100 + Math.random() * 900)}`;

  const doc = await prisma.technicalDocument.create({
    data: {
      tenantId: auth.board.tenantId,
      boardId,
      title: String(title).trim(),
      category,
      code: String(docCode).trim(),
      version: String(version || "Rev. 1.0"),
      fileSize: String(fileSize || "1.8 MB"),
      fileUrl: String(fileUrl || `/api/boards/${boardId}/documents?code=${docCode}`),
      summary: String(
        summary ||
          "Documento técnico verificado bajo Pliego Técnico Normativo RIC / SEC e incorporado al Pasaporte Digital del Tablero."
      ).trim(),
      uploadedBy: `${auth.session.fullName}`,
    },
  });

  return NextResponse.json({ ok: true, document: doc });
}
