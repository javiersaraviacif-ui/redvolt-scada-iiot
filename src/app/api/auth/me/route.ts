import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureBackgroundTelemetryServices, getTelemetryRuntimeStatus } from "@/lib/mqtt-service";

export async function GET() {
  ensureBackgroundTelemetryServices();
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    user: session,
    runtime: getTelemetryRuntimeStatus(),
  });
}
