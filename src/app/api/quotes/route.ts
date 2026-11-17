import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName,
      rut,
      contactName,
      email,
      phone,
      serviceCategory,
      facilityType,
      projectDetails,
    } = body;

    if (!companyName || !contactName || !email || !phone || !serviceCategory || !projectDetails) {
      return NextResponse.json(
        { error: "Por favor complete todos los campos técnicos obligatorios." },
        { status: 400 }
      );
    }

    const quote = await prisma.quoteRequest.create({
      data: {
        companyName: String(companyName).trim(),
        rut: rut ? String(rut).trim() : null,
        contactName: String(contactName).trim(),
        email: String(email).trim(),
        phone: String(phone).trim(),
        serviceCategory: String(serviceCategory),
        facilityType: String(facilityType || "Planta Industrial / Hospital"),
        projectDetails: String(projectDetails).trim(),
      },
    });

    return NextResponse.json({
      ok: true,
      quote,
      folio: `COT-RV-${quote.id.slice(-6).toUpperCase()}`,
    });
  } catch (error) {
    console.error("[Quote API Error]:", error);
    return NextResponse.json(
      { error: "Error al registrar solicitud de cotización técnica" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const quotes = await prisma.quoteRequest.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ quotes });
}
