import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./prisma";

export const SESSION_COOKIE_NAME = "redvolt_session";
const SECRET = process.env.SESSION_SECRET || "redvolt-scada-iiot-enterprise-secret-2026";

export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  jobTitle: string;
  role: "SUPER_ADMIN" | "CLIENT";
  tenantId: string | null;
  tenantName: string | null;
  exp: number;
}

export function signSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + 7 * 24 * 3600 * 1000,
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [data, signature] = token.split(".");
    if (!data || !signature) return null;
    const expectedSig = crypto
      .createHmac("sha256", SECRET)
      .update(data)
      .digest("base64url");
    if (signature !== expectedSig) return null;
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Valida que el usuario autenticado tenga acceso al tablero solicitado.
 * Aplica aislamiento estricto Multi-Tenant (tenant_id).
 */
export async function authorizeBoardAccess(boardId: string) {
  const session = await getSessionUser();
  if (!session) {
    return { error: "No autenticado", status: 401 as const, session: null, board: null };
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      tenant: true,
      project: true,
      devices: true,
    },
  });

  if (!board) {
    return { error: "Tablero no encontrado", status: 404 as const, session, board: null };
  }

  if (session.role === "CLIENT" && board.tenantId !== session.tenantId) {
    return {
      error: "Acceso denegado: Aislamiento Multi-Tenant activo (Tablero pertenece a otra institución)",
      status: 403 as const,
      session,
      board: null,
    };
  }

  return { error: null, status: 200 as const, session, board };
}
