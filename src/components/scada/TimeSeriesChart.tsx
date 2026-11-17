"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
} from "recharts";
import { Download, Clock, Activity } from "lucide-react";

interface TimeSeriesChartProps {
  boardCode: string;
  series: Record<string, number | string>[];
  selectedRange: string;
  onRangeChange: (range: string) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (val: string) => void;
  onCustomToChange: (val: string) => void;
  onDownloadCsv: () => void;
}

export function TimeSeriesChart({
  boardCode,
  series,
  selectedRange,
  onRangeChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  onDownloadCsv,
}: TimeSeriesChartProps) {
  const ranges = [
    { id: "1h", label: "1 Hora" },
    { id: "24h", label: "24 Horas" },
    { id: "7d", label: "7 Días" },
    { id: "30d", label: "30 Días" },
    { id: "custom", label: "Personalizado" },
  ];

  return (
    <div className="space-y-5">
      {/* Barra de controles de rango temporal + Exportación CSV */}
      <div className="bg-[#1E293B]/90 border border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mr-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            VENTANA TEMPORAL:
          </span>
          {ranges.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onRangeChange(r.id)}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                selectedRange === r.id
                  ? "bg-cyan-500 text-slate-950 font-semibold"
                  : "bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-700/80"
              }`}
            >
              {r.label}
            </button>
          ))}

          {selectedRange === "custom" && (
            <div className="flex flex-wrap items-center gap-2 ml-2">
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => onCustomFromChange(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200"
              />
              <span className="text-xs text-slate-400">a</span>
              <input
                type="datetime-local"
                value={customTo}
                onChange={(e) => onCustomToChange(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          id="btn-download-csv"
          onClick={onDownloadCsv}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40 text-xs font-mono font-medium transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Descargar CSV ({boardCode})
        </button>
      </div>

      {/* Gráficos gemelos: 1. Comparativa de Tensión Trifásica (L1, L2, L3) con Brush Zoom | 2. Corrientes de Carga por Fase */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Gráfico 1: Voltajes Trifásicos L1, L2, L3 (Líneas + Zoom Brush) */}
        <div className="bg-[#1E293B]/90 border border-slate-800 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                TELEMETRÍA EN TIEMPO REAL — COMPARATIVA DE FASES
              </span>
              <h3 className="text-sm font-semibold text-white">
                Perfil de Tensión Trifásica L1 / L2 / L3 (V RMS)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              Nominal: 220V ±6% (RIC)
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 16, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.45} />
                <XAxis
                  dataKey="timeLabel"
                  stroke="#94A3B8"
                  tick={{ fontSize: 11, fontFamily: "monospace" }}
                />
                <YAxis
                  domain={[205, 238]}
                  stroke="#94A3B8"
                  tick={{ fontSize: 11, fontFamily: "monospace" }}
                  unit="V"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    color: "#F8FAFC",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "monospace" }} />
                <Line
                  type="monotone"
                  dataKey="V_L1"
                  name="Fase L1 (V)"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="V_L2"
                  name="Fase L2 (V)"
                  stroke="#F97316"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="V_L3"
                  name="Fase L3 (V)"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Brush
                  dataKey="timeLabel"
                  height={22}
                  stroke="#06B6D4"
                  fill="#0F172A"
                  travellerWidth={8}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Corrientes de Carga Trifásica (Áreas Apiladas/Superpuestas + Zoom) */}
        <div className="bg-[#1E293B]/90 border border-slate-800 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[11px] font-mono text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                DEMANDA DE CORRIENTE POR FASE
              </span>
              <h3 className="text-sm font-semibold text-white">
                Corrientes de Carga L1 / L2 / L3 (Amperes RMS)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              Muestreo: 3.0s
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 16, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.45} />
                <XAxis
                  dataKey="timeLabel"
                  stroke="#94A3B8"
                  tick={{ fontSize: 11, fontFamily: "monospace" }}
                />
                <YAxis
                  stroke="#94A3B8"
                  tick={{ fontSize: 11, fontFamily: "monospace" }}
                  unit="A"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    color: "#F8FAFC",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "monospace" }} />
                <Area
                  type="monotone"
                  dataKey="I_L1"
                  name="Corriente L1 (A)"
                  stroke="#06B6D4"
                  fill="#06B6D4"
                  fillOpacity={0.18}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="I_L2"
                  name="Corriente L2 (A)"
                  stroke="#F97316"
                  fill="#F97316"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="I_L3"
                  name="Corriente L3 (A)"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Brush
                  dataKey="timeLabel"
                  height={22}
                  stroke="#F97316"
                  fill="#0F172A"
                  travellerWidth={8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
