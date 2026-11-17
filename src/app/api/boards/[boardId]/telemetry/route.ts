import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeBoardAccess } from "@/lib/auth";
import { ensureBackgroundTelemetryServices } from "@/lib/mqtt-service";

/**
 * GET /api/boards/[boardId]/telemetry?range=1h|24h|7d|30d|custom&from=...&to=...
 * Retorna series de tiempo pivoteadas por timestamp para visualización en Recharts y estadísticas min/max/avg.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ boardId: string }> }
) {
  ensureBackgroundTelemetryServices();
  const { boardId } = await context.params;
  const auth = await authorizeBoardAccess(boardId);
  if (auth.error || !auth.board) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "1h";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const now = Date.now();
  let startTime = new Date(now - 3600 * 1000);
  let endTime = new Date(now);

  if (range === "24h") {
    startTime = new Date(now - 24 * 3600 * 1000);
  } else if (range === "7d") {
    startTime = new Date(now - 7 * 24 * 3600 * 1000);
  } else if (range === "30d") {
    startTime = new Date(now - 30 * 24 * 3600 * 1000);
  } else if (range === "custom" && fromParam) {
    startTime = new Date(fromParam);
    if (toParam) endTime = new Date(toParam);
  }

  const readings = await prisma.telemetryReading.findMany({
    where: {
      boardId,
      tenantId: auth.board.tenantId,
      timestamp: {
        gte: startTime,
        lte: endTime,
      },
    },
    orderBy: { timestamp: "asc" },
    take: 2400,
  });

  // Agrupar lecturas por segundo para construir filas multifase L1, L2, L3, FREQ, TEMP_BARRAS
  const bucketMap = new Map<string, Record<string, number | string>>();
  const statsAccumulator: Record<string, { min: number; max: number; sum: number; count: number }> =
    {};

  for (const r of readings) {
    const bucketKey = new Date(Math.floor(r.timestamp.getTime() / 1000) * 1000).toISOString();
    if (!bucketMap.has(bucketKey)) {
      bucketMap.set(bucketKey, {
        timestamp: bucketKey,
        timeLabel: new Date(bucketKey).toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      });
    }
    const row = bucketMap.get(bucketKey)!;
    row[r.variableCode] = r.value;

    if (!statsAccumulator[r.variableCode]) {
      statsAccumulator[r.variableCode] = {
        min: r.value,
        max: r.value,
        sum: 0,
        count: 0,
      };
    }
    const acc = statsAccumulator[r.variableCode];
    acc.min = Math.min(acc.min, r.value);
    acc.max = Math.max(acc.max, r.value);
    acc.sum += r.value;
    acc.count += 1;
  }

  const series = Array.from(bucketMap.values()).slice(-120);

  const stats: Record<string, { min: number; max: number; avg: number; count: number }> = {};
  for (const [code, acc] of Object.entries(statsAccumulator)) {
    stats[code] = {
      min: +acc.min.toFixed(2),
      max: +acc.max.toFixed(2),
      avg: +(acc.sum / Math.max(1, acc.count)).toFixed(2),
      count: acc.count,
    };
  }

  return NextResponse.json({
    range,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    series,
    stats,
  });
}
