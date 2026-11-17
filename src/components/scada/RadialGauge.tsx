"use client";

import React from "react";

interface RadialGaugeProps {
  label: string;
  code: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  warnLow?: number | null;
  warnHigh?: number | null;
  critLow?: number | null;
  critHigh?: number | null;
}

export function RadialGauge({
  label,
  code,
  value,
  unit,
  min,
  max,
  warnLow,
  warnHigh,
  critLow,
  critHigh,
}: RadialGaugeProps) {
  const clamped = Math.max(min, Math.min(max, value));
  const ratio = (clamped - min) / Math.max(1, max - min);

  // Determinar estado por umbrales (Normal: verde #10B981, Advertencia: amarillo #F59E0B, Crítico: rojo #EF4444)
  let status: "NORMAL" | "WARNING" | "CRITICAL" = "NORMAL";
  let strokeColor = "#10B981";
  let badgeClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  let statusText = "NORMAL";

  if (
    (critHigh !== null && critHigh !== undefined && value >= critHigh) ||
    (critLow !== null && critLow !== undefined && critLow > 0 && value <= critLow)
  ) {
    status = "CRITICAL";
    strokeColor = "#EF4444";
    badgeClass = "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse";
    statusText = "CRÍTICO";
  } else if (
    (warnHigh !== null && warnHigh !== undefined && value >= warnHigh) ||
    (warnLow !== null && warnLow !== undefined && warnLow > 0 && value <= warnLow)
  ) {
    status = "WARNING";
    strokeColor = "#F59E0B";
    badgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/40";
    statusText = "ADVERTENCIA";
  }

  // Geometría de arco SVG 180 grados
  const radius = 54;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);

  return (
    <div
      data-status={status}
      className="bg-[#1E293B]/90 border border-slate-700/80 rounded-lg p-4 flex flex-col justify-between shadow-lg transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 block">
            {code}
          </span>
          <h4 className="text-xs font-medium text-slate-200 truncate">{label}</h4>
        </div>
        <span
          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${badgeClass}`}
        >
          {statusText}
        </span>
      </div>

      <div className="relative flex flex-col items-center justify-center my-1">
        <svg className="w-36 h-20 overflow-visible" viewBox="0 0 140 80">
          {/* Arco base */}
          <path
            d="M 16 70 A 54 54 0 0 1 124 70"
            fill="none"
            stroke="#0F172A"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Arco de valor dinámico */}
          <path
            d="M 16 70 A 54 54 0 0 1 124 70"
            fill="none"
            stroke={strokeColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.45s ease, stroke 0.3s ease" }}
          />
        </svg>

        <div className="-mt-7 text-center">
          <div className="text-2xl font-mono font-bold text-white tracking-tight">
            {value.toFixed(1)}
            <span className="text-xs font-normal text-slate-400 ml-1">{unit}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800 pt-2 mt-1">
        <span>Mín: {min}{unit}</span>
        {warnHigh ? <span>Umbral: {warnHigh}{unit}</span> : null}
        <span>Máx: {max}{unit}</span>
      </div>
    </div>
  );
}
