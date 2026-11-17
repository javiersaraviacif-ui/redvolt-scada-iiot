import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";
import { ensureBackgroundTelemetryServices } from "@/lib/mqtt-service";

export async function POST(req: NextRequest) {
  try {
    ensureBackgroundTelemetryServices();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Debe ingresar correo corporativo y contraseña" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      include: { tenant: true },
    });

    if (!user || user.passwordHash !== password) {
      return NextResponse.json(
        { error: "Credenciales inválidas. Verifique su correo o contraseña." },
        { status: 401 }
      );
    }

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      jobTitle: user.jobTitle,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name ?? "Redvolt Ingeniería Central (Multi-Tenant)",
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        jobTitle: user.jobTitle,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name ?? "Redvolt Ingeniería Central (Multi-Tenant)",
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });

    return response;
  } catch (error) {
    console.error("[Login API Error]:", error);
    return NextResponse.json({ error: "Error interno de autenticación" }, { status: 500 });
  }
}
