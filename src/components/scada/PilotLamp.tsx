"use client";

import React from "react";

interface PilotLampProps {
  code: string;
  name: string;
  value: number;
  onToggle?: (code: string) => void;
}

export function PilotLamp({ code, name, value, onToggle }: PilotLampProps) {
  const isOn = value >= 0.5;
  const isFaultIndicator = code.includes("FAULT");
  const isAutoSelector = code.includes("AUTO");
  const isGen = code.includes("GEN");

  // Definir colores de lámpara piloto industrial según función
  let lampColorClass = "bg-slate-700 border-slate-600";
  let statusLabel = "ABIERTO / OFF";
  let badgeTextClass = "text-slate-400";

  if (isFaultIndicator) {
    if (isOn) {
      lampColorClass = "bg-red-500 border-red-300 shadow-[0_0_14px_rgba(239,68,68,0.85)] animate-pulse";
      statusLabel = "FALLA ACTIVA (TRIP)";
      badgeTextClass = "text-red-400 font-semibold";
    } else {
      lampColorClass = "bg-emerald-500/80 border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
      statusLabel = "SIN FALLA (OK)";
      badgeTextClass = "text-emerald-400";
    }
  } else if (isAutoSelector) {
    if (isOn) {
      lampColorClass = "bg-cyan-400 border-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.8)]";
      statusLabel = "MODO AUTOMÁTICO";
      badgeTextClass = "text-cyan-300";
    } else {
      lampColorClass = "bg-orange-500 border-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.8)]";
      statusLabel = "MODO MANUAL LOCAL";
      badgeTextClass = "text-orange-400";
    }
  } else if (isGen) {
    if (isOn) {
      lampColorClass = "bg-amber-400 border-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.85)]";
      statusLabel = "EN LÍNEA (EMERGENCIA)";
      badgeTextClass = "text-amber-300";
    } else {
      lampColorClass = "bg-slate-700 border-slate-500";
      statusLabel = "STANDBY (RED NORMAL)";
      badgeTextClass = "text-slate-400";
    }
  } else {
    if (isOn) {
      lampColorClass = "bg-emerald-500 border-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.8)]";
      statusLabel = "CERRADO / EN SERVICIO";
      badgeTextClass = "text-emerald-400";
    } else {
      lampColorClass = "bg-slate-700 border-slate-500";
      statusLabel = "ABIERTO / DESENERGIZADO";
      badgeTextClass = "text-slate-400";
    }
  }

  return (
    <div className="bg-[#0F172A]/90 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {/* Lámpara Piloto Física biselada */}
        <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-slate-900 border-2 border-slate-700 shrink-0">
          <span className={`w-5 h-5 rounded-full border transition-all ${lampColorClass}`} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            {code}
          </div>
          <div className="text-xs font-medium text-slate-100 truncate">{name}</div>
          <div className={`text-[11px] font-mono mt-0.5 ${badgeTextClass}`}>{statusLabel}</div>
        </div>
      </div>

      {onToggle && (
        <button
          type="button"
          onClick={() => onToggle(code)}
          title="Conmutar estado en simulador/PLC"
          className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0 transition-colors cursor-pointer"
        >
          Conmutar
        </button>
      )}
    </div>
  );
}
