import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExecutiveReportInput {
  tenantName: string;
  tenantRut: string;
  projectName: string;
  projectLocation: string;
  boardName: string;
  boardCode: string;
  normative: string;
  plcModel: string;
  gatewayModel: string;
  operationalStatus: string;
  gatewayStatus: string;
  latencyMs: number;
  energyKwh: number;
  tariffClp: number;
  costClp: number;
  apparentPowerKva: number;
  unbalancePct: number;
  stats: Record<string, { min: number; max: number; avg: number; count: number }>;
  hourMeters: {
    code: string;
    equipmentName: string;
    accumulatedHours: number;
    maintenanceTargetHours: number;
    isRunning: boolean;
  }[];
  alarms: {
    triggeredAt: string;
    variableCode: string;
    severity: string;
    message: string;
    measuredValue: number;
    unit: string;
    status: string;
    ackedByName?: string | null;
  }[];
  logs: {
    performedAt: string;
    technicianName: string;
    maintenanceType: string;
    details: string;
  }[];
}

export function generateExecutivePdfReport(data: ExecutiveReportInput) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const nowStr = new Date().toLocaleString("es-CL");

  // Header Corporativo Redvolt (#0F172A)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 36, "F");

  // Barra de acento cian/naranjo industrial
  doc.setFillColor(6, 182, 212);
  doc.rect(0, 36, 145, 2, "F");
  doc.setFillColor(249, 115, 22);
  doc.rect(145, 36, 65, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("REDVOLT INGENIERÍA S.A.", 14, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(6, 182, 212);
  doc.text("INGENIERÍA ELÉCTRICA, AUTOMATIZACIÓN INDUSTRIAL Y TELEMETRÍA IIoT", 14, 21);

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(8.5);
  doc.text("REPORTE EJECUTIVO DE CONTINUIDAD OPERACIONAL, CALIDAD DE ENERGÍA Y O&M", 14, 28);
  doc.text(`Emitido: ${nowStr}`, 145, 15);
  doc.text(`Código Activo: ${data.boardCode}`, 145, 21);
  doc.text(`Normativa: RIC / SEC Chile`, 145, 28);

  // 1. Ficha Técnica del Cliente y Tablero
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("1. IDENTIFICACIÓN DEL CLIENTE Y PASAPORTE DEL TABLERO", 14, 46);

  autoTable(doc, {
    startY: 49,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    body: [
      ["Institución / Cliente", `${data.tenantName} (RUT: ${data.tenantRut})`, "Instalación / Proyecto", data.projectName],
      ["Tablero / Equipo", `${data.boardName} (${data.boardCode})`, "Ubicación Técnica", data.projectLocation],
      ["Controlador / Medición", data.plcModel, "Gateway IIoT", `${data.gatewayModel} (${data.gatewayStatus} - ${data.latencyMs}ms)`],
      ["Estado Operativo", data.operationalStatus, "Pliego Normativo", data.normative],
    ],
  });

  // 2. Resumen Energético y Variables Virtuales
  const afterTable1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("2. CONSUMO ENERGÉTICO, COSTO OPERACIONAL Y VARIABLES VIRTUALES", 14, afterTable1);

  autoTable(doc, {
    startY: afterTable1 + 3,
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 2.4 },
    headStyles: { fillColor: [6, 182, 212], textColor: [15, 23, 42], fontStyle: "bold" },
    head: [["Indicador Calculado", "Fórmula / Método", "Valor Actual", "Estado / Referencia"]],
    body: [
      [
        "Energía Activa Acumulada",
        "Integración continua kWh",
        `${data.energyKwh.toLocaleString("es-CL")} kWh`,
        "Medición certificada Clase 0.5S",
      ],
      [
        "Costo Operacional Valorizado",
        `Tarifa ref. $${data.tariffClp} CLP/kWh`,
        `$${data.costClp.toLocaleString("es-CL")} CLP`,
        "Pliego Tarifario Industrial/Clínico",
      ],
      [
        "Potencia Aparente Trifásica (S)",
        "S = (V_L1*I_L1 + V_L2*I_L2 + V_L3*I_L3)/1000",
        `${data.apparentPowerKva.toFixed(2)} kVA`,
        "Régimen de carga continua",
      ],
      [
        "Desbalance de Tensión entre Fases",
        "MAX(|V_i - V_avg|) / V_avg * 100",
        `${data.unbalancePct.toFixed(2)} %`,
        data.unbalancePct < 2.0 ? "NORMAL (< 2.0% RIC)" : "ALERTA DESBALANCE",
      ],
    ],
  });

  // 3. Resumen Estadístico de Voltaje, Corriente y Frecuencia
  const afterTable2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("3. RESUMEN ESTADÍSTICO DE TELEMETRÍA ELÉCTRICA (VENTANA ANALIZADA)", 14, afterTable2);

  const statVariables = [
    { code: "V_L1", label: "Voltaje Fase L1-N (V)" },
    { code: "V_L2", label: "Voltaje Fase L2-N (V)" },
    { code: "V_L3", label: "Voltaje Fase L3-N (V)" },
    { code: "I_L1", label: "Corriente Línea L1 (A)" },
    { code: "I_L2", label: "Corriente Línea L2 (A)" },
    { code: "I_L3", label: "Corriente Línea L3 (A)" },
    { code: "FREQ", label: "Frecuencia de Red (Hz)" },
    { code: "TEMP_BARRAS", label: "Temperatura Barras (°C)" },
  ];

  autoTable(doc, {
    startY: afterTable2 + 3,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    head: [["Variable Monitoreada", "Mínimo Registrado", "Promedio Periodo", "Máximo Registrado", "Muestras"]],
    body: statVariables.map((sv) => {
      const st = data.stats[sv.code] || { min: 0, avg: 0, max: 0, count: 0 };
      return [
        sv.label,
        st.min.toFixed(2),
        st.avg.toFixed(2),
        st.max.toFixed(2),
        String(st.count),
      ];
    }),
  });

  // 4. Estado de Horómetros Virtuales y Mantenimiento Predictivo
  const afterTable3 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("4. ESTADO DE HORÓMETROS VIRTUALES Y MANTENIMIENTO PREDICTIVO", 14, afterTable3);

  autoTable(doc, {
    startY: afterTable3 + 3,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255] },
    head: [["Código", "Equipo / Activo Monitoreado", "Horas Acumuladas", "Meta Preventiva", "Uso %", "Condición"]],
    body: data.hourMeters.map((hm) => {
      const pct = ((hm.accumulatedHours / hm.maintenanceTargetHours) * 100).toFixed(1);
      return [
        hm.code,
        hm.equipmentName,
        `${hm.accumulatedHours.toFixed(1)} hrs`,
        `${hm.maintenanceTargetHours.toFixed(0)} hrs`,
        `${pct}%`,
        Number(pct) >= 90 ? "PROGRAMAR MANTENCIÓN" : "OPERACIÓN NORMAL",
      ];
    }),
  });

  // Nueva página si queda poco espacio para Alarmas y Bitácora
  doc.addPage();

  // Header compacto en página 2
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`REDVOLT SCADA/IIoT — ANEXO DE ALARMAS Y BITÁCORA EN TERRENO (${data.boardCode})`, 14, 11);

  // 5. Resumen de Alarmas del Periodo
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("5. REGISTRO DE ALARMAS Y EVENTOS ELÉCTRICOS DEL PERIODO", 14, 28);

  autoTable(doc, {
    startY: 31,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    head: [["Fecha / Hora", "Variable", "Severidad", "Valor Medido", "Estado / ACK por Usuario", "Detalle"]],
    body:
      data.alarms.length > 0
        ? data.alarms.slice(0, 8).map((a) => [
            new Date(a.triggeredAt).toLocaleString("es-CL"),
            a.variableCode,
            a.severity,
            `${a.measuredValue} ${a.unit}`,
            a.status === "ACKNOWLEDGED" ? `ACK (${a.ackedByName || "Operador"})` : a.status,
            a.message,
          ])
        : [["-", "-", "SIN ALARMAS", "-", "-", "No se registran eventos en la ventana seleccionada"]],
  });

  // 6. Últimas Entradas de la Bitácora de Mantenciones en Terreno
  const afterAlarms = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("6. BITÁCORA DE INTERVENCIONES Y MANTENCIONES EN TERRENO", 14, afterAlarms);

  autoTable(doc, {
    startY: afterAlarms + 3,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2.4 },
    headStyles: { fillColor: [15, 23, 42], textColor: [6, 182, 212] },
    head: [["Fecha Intervención", "Técnico Responsable", "Tipo Mantención", "Detalle Técnico Ejecutado"]],
    body: data.logs.slice(0, 8).map((l) => [
      new Date(l.performedAt).toLocaleDateString("es-CL"),
      l.technicianName,
      l.maintenanceType,
      l.details,
    ]),
  });

  // Pie de firma técnica
  const footerY = 272;
  doc.setDrawColor(148, 163, 184);
  doc.line(14, footerY, 196, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Documento generado automáticamente por Plataforma Redvolt SCADA/IIoT — Cumplimiento Pliegos Técnicos RIC / SEC Chile.",
    14,
    footerY + 6
  );

  const fileName = `Reporte_Ejecutivo_Redvolt_${data.boardCode}_${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  doc.save(fileName);
  return fileName;
}

export function exportTelemetryToCsv(
  boardCode: string,
  series: Record<string, number | string>[]
) {
  if (!series || series.length === 0) return;
  const headers = [
    "timestamp",
    "V_L1",
    "V_L2",
    "V_L3",
    "I_L1",
    "I_L2",
    "I_L3",
    "FREQ",
    "TEMP_BARRAS",
  ];
  const rows = series.map((row) =>
    headers.map((h) => (row[h] !== undefined ? String(row[h]) : "")).join(",")
  );
  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Telemetria_Historica_${boardCode}_${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/:/g, "-")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
