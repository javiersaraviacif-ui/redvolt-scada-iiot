"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Building2,
  FolderKanban,
  Cpu,
  Activity,
  Bell,
  Clock,
  FileText,
  Wrench,
  ShieldAlert,
  CheckCircle2,
  FileDown,
  LogOut,
  Radio,
  Plus,
  Calculator,
  Server,
  Eye,
  Send,
  Settings,
} from "lucide-react";
import { RadialGauge } from "@/components/scada/RadialGauge";
import { PilotLamp } from "@/components/scada/PilotLamp";
import { TimeSeriesChart } from "@/components/scada/TimeSeriesChart";
import {
  generateExecutivePdfReport,
  exportTelemetryToCsv,
} from "@/lib/pdf-report";

interface SessionUser {
  userId: string;
  email: string;
  fullName: string;
  jobTitle: string;
  role: "SUPER_ADMIN" | "CLIENT";
  tenantId: string | null;
  tenantName: string | null;
}

interface BoardSummary {
  id: string;
  name: string;
  code: string;
  operationalStatus: "OPERATIVO" | "EN_MANTENCION" | "FUERA_DE_SERVICIO";
  gatewayStatus: string;
  latencyMs: number;
  _count?: {
    alarms: number;
    technicalDocuments: number;
    maintenanceLogs: number;
  };
}

interface ProjectNode {
  id: string;
  name: string;
  code: string;
  location: string;
  description: string;
  boards: BoardSummary[];
}

interface TenantNode {
  id: string;
  name: string;
  rut: string;
  industry: string;
  contactEmail: string;
  projects: ProjectNode[];
}

interface SensorVariable {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string;
  dataType: "ANALOG" | "DIGITAL";
  minNormal: number;
  warnLow: number | null;
  warnHigh: number | null;
  critLow: number | null;
  critHigh: number | null;
  currentValue: number;
}

interface VirtualVariable {
  id: string;
  code: string;
  name: string;
  formula: string;
  unit: string;
  description: string;
  currentValue: number;
}

interface HourMeter {
  id: string;
  code: string;
  equipmentName: string;
  accumulatedHours: number;
  maintenanceTargetHours: number;
  warningHoursThreshold: number;
  triggerVariableCode: string;
  triggerThreshold: number;
  isRunning: boolean;
}

interface AlarmEvent {
  id: string;
  variableCode: string;
  variableName: string;
  severity: "WARNING" | "CRITICAL";
  message: string;
  measuredValue: number;
  thresholdValue: number;
  unit: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  triggeredAt: string;
  ackedAt?: string | null;
  ackedByName?: string | null;
}

interface TechnicalDocument {
  id: string;
  title: string;
  category: string;
  code: string;
  version: string;
  fileSize: string;
  fileUrl: string;
  summary: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface MaintenanceLog {
  id: string;
  performedAt: string;
  technicianName: string;
  maintenanceType: string;
  details: string;
}

interface FullBoardDetail {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  code: string;
  normative: string;
  plcModel: string;
  gatewayModel: string;
  operationalStatus: "OPERATIVO" | "EN_MANTENCION" | "FUERA_DE_SERVICIO";
  effectiveGatewayStatus: "ONLINE" | "OFFLINE";
  lastHeartbeat: string;
  secondsSinceHeartbeat: number;
  latencyMs: number;
  energyAccumulatedKwh: number;
  tariffClpPerKwh: number;
  tenant: TenantNode;
  project: ProjectNode;
  devices: {
    id: string;
    name: string;
    protocol: string;
    apiKey: string;
    mqttTopicPrefix: string;
    ipAddress: string;
    firmware: string;
  }[];
  sensorVariables: SensorVariable[];
  virtualVariables: VirtualVariable[];
  hourMeters: HourMeter[];
  alarms: AlarmEvent[];
  technicalDocuments: TechnicalDocument[];
  maintenanceLogs: MaintenanceLog[];
}

export default function ScadaPortalPage() {
  const router = useRouter();

  const [session, setSession] = useState<SessionUser | null>(null);
  const [tenants, setTenants] = useState<TenantNode[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");

  const [boardDetail, setBoardDetail] = useState<FullBoardDetail | null>(null);
  const [telemetrySeries, setTelemetrySeries] = useState<Record<string, number | string>[]>([]);
  const [telemetryStats, setTelemetryStats] = useState<
    Record<string, { min: number; max: number; avg: number; count: number }>
  >({});

  const [selectedRange, setSelectedRange] = useState<string>("1h");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  const [activeTab, setActiveTab] = useState<
    "scada" | "alarms" | "om_hourmeters" | "documents" | "logbook" | "ingest" | "admin"
  >("scada");

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Estado para modal de visualización de plano/documento técnico
  const [previewDoc, setPreviewDoc] = useState<TechnicalDocument | null>(null);

  // Formularios O&M y Super-Admin
  const [newLogForm, setNewLogForm] = useState({
    performedAt: "2026-11-17T10:00",
    technicianName: "Ing. Cristóbal Valdés M. — Redvolt O&M",
    maintenanceType: "PREVENTIVA",
    details: "",
  });

  useEffect(() => {
    setNewLogForm((prev) => ({
      ...prev,
      performedAt: new Date().toISOString().slice(0, 16),
    }));
  }, []);

  const [newDocForm, setNewDocForm] = useState({
    title: "",
    category: "UNILINEAL",
    version: "Rev. 1.0 As-Built",
    fileSize: "2.1 MB",
    summary: "",
  });

  const [newVirtualVarForm, setNewVirtualVarForm] = useState({
    code: "",
    name: "",
    formula: "",
    unit: "kW",
    description: "",
    currentValue: "38.5",
  });

  const [ingestTestForm, setIngestTestForm] = useState({
    protocol: "MQTT_TOPIC",
    variable: "V_L1",
    value: "223.4",
  });

  const [adminNewTenant, setAdminNewTenant] = useState({
    name: "",
    rut: "",
    industry: "Salud / Industria / Energía",
    contactEmail: "",
    address: "",
  });

  const [adminNewProject, setAdminNewProject] = useState({
    name: "",
    code: "",
    location: "",
    description: "",
  });

  const [adminNewBoard, setAdminNewBoard] = useState({
    name: "",
    code: "",
    normative: "RIC N°02 / SEC",
    plcModel: "Siemens S7-1200 + Analizador PAC3220",
    gatewayModel: "Gateway CBOX IIoT MQTT/REST",
    tariffClpPerKwh: "152",
  });

  function showToast(msg: string) {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 4500);
  }

  // Cargar jerarquía de Tenants -> Proyectos -> Tableros
  const fetchHierarchy = useCallback(async () => {
    const res = await fetch("/api/tenants", { cache: "no-store" });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setSession(data.session);
    const list: TenantNode[] = data.tenants || [];
    setTenants(list);

    if (list.length > 0 && !selectedTenantId) {
      // Priorizar Hospital Clínico Regional por defecto
      const defaultTenant =
        list.find((t) => t.id === "tenant-hospital-regional") || list[0];
      setSelectedTenantId(defaultTenant.id);
      const firstProj = defaultTenant.projects[0];
      if (firstProj) {
        setSelectedProjectId(firstProj.id);
        const firstBoard = firstProj.boards[0];
        if (firstBoard) {
          setSelectedBoardId(firstBoard.id);
        }
      }
    }
    setLoadingInitial(false);
  }, [router, selectedTenantId]);

  const fetchBoardAndTelemetry = useCallback(async () => {
    if (!selectedBoardId) return;
    try {
      const [boardRes, telRes] = await Promise.all([
        fetch(`/api/boards/${selectedBoardId}`, { cache: "no-store" }),
        fetch(
          `/api/boards/${selectedBoardId}/telemetry?range=${selectedRange}&from=${encodeURIComponent(
            customFrom
          )}&to=${encodeURIComponent(customTo)}`,
          { cache: "no-store" }
        ),
      ]);

      if (boardRes.ok) {
        const bData = await boardRes.json();
        setBoardDetail(bData.board);
      }
      if (telRes.ok) {
        const tData = await telRes.json();
        setTelemetrySeries(tData.series || []);
        setTelemetryStats(tData.stats || {});
      }
    } catch (e) {
      console.error("Error refrescando telemetría:", e);
    }
  }, [selectedBoardId, selectedRange, customFrom, customTo]);

  useEffect(() => {
    void fetchHierarchy();
  }, [fetchHierarchy]);

  // Refresco en tiempo real cada 3 segundos (sincronizado con el simulador)
  useEffect(() => {
    if (!selectedBoardId) return;
    void fetchBoardAndTelemetry();
    const timer = setInterval(() => {
      void fetchBoardAndTelemetry();
    }, 3000);
    return () => clearInterval(timer);
  }, [selectedBoardId, fetchBoardAndTelemetry]);

  // Cambiar de Cliente en la jerarquía
  function handleSelectTenant(tenantId: string) {
    setSelectedTenantId(tenantId);
    const t = tenants.find((item) => item.id === tenantId);
    if (t && t.projects.length > 0) {
      setSelectedProjectId(t.projects[0].id);
      if (t.projects[0].boards.length > 0) {
        setSelectedBoardId(t.projects[0].boards[0].id);
      }
    }
  }

  // Cambiar de Proyecto / Instalación
  function handleSelectProject(projectId: string) {
    setSelectedProjectId(projectId);
    const t = tenants.find((item) => item.id === selectedTenantId);
    const p = t?.projects.find((proj) => proj.id === projectId);
    if (p && p.boards.length > 0) {
      setSelectedBoardId(p.boards[0].id);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    window.location.href = "/login";
  }

  async function handleToggleDigital(code: string) {
    if (!boardDetail) return;
    const res = await fetch(`/api/boards/${boardDetail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toggleDigitalCode: code }),
    });
    if (res.ok) {
      showToast(`Estado digital ${code} conmutado en PLC/Simulador`);
      void fetchBoardAndTelemetry();
    }
  }

  async function handleChangeOperationalStatus(
    status: "OPERATIVO" | "EN_MANTENCION" | "FUERA_DE_SERVICIO"
  ) {
    if (!boardDetail) return;
    const res = await fetch(`/api/boards/${boardDetail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationalStatus: status }),
    });
    if (res.ok) {
      showToast(`Estado operativo del tablero actualizado a ${status}`);
      void fetchBoardAndTelemetry();
      void fetchHierarchy();
    }
  }

  async function handleAckAlarm(alarmId: string) {
    if (!boardDetail) return;
    const res = await fetch(`/api/boards/${boardDetail.id}/alarms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ACK", alarmId }),
    });
    if (res.ok) {
      showToast("Alarma reconocida (ACK) y auditada con su usuario");
      void fetchBoardAndTelemetry();
      void fetchHierarchy();
    }
  }

  async function handleTriggerTestAlarm() {
    if (!boardDetail) return;
    const res = await fetch(`/api/boards/${boardDetail.id}/alarms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "TRIGGER_TEST",
        variableCode: "V_L1",
        variableName: "Voltaje Fase L1-N",
        severity: "CRITICAL",
        measuredValue: 243.6,
        thresholdValue: 240.0,
        unit: "V",
        message:
          "Sobretensión Crítica detectada en Fase L1 (243.6 V >= 240.0 V) — Inyección de prueba SCADA",
      }),
    });
    if (res.ok) {
      showToast("Alarma crítica de prueba generada en el tablero");
      void fetchBoardAndTelemetry();
      void fetchHierarchy();
    }
  }

  async function handleCreateMaintenanceLog(e: React.FormEvent) {
    e.preventDefault();
    if (!boardDetail) return;
    const res = await fetch(`/api/boards/${boardDetail.id}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newLogForm),
    });
    if (res.ok) {
      setNewLogForm({
        ...newLogForm,
        details: "",
      });
      showToast("Intervención registrada exitosamente en la Bitácora de Terreno");
      void fetchBoardAndTelemetry();
      void fetchHierarchy();
    }
  }

  async function handleCreateDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!boardDetail) return;
    const res = await fetch(`/api/boards/${boardDetail.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDocForm),
    });
    if (res.ok) {
      setNewDocForm({
        title: "",
        category: "UNILINEAL",
        version: "Rev. 1.0 As-Built",
        fileSize: "2.1 MB",
        summary: "",
      });
      showToast("Documento incorporado al Pasaporte Digital del Tablero");
      void fetchBoardAndTelemetry();
      void fetchHierarchy();
    }
  }

  async function handleCreateVirtualVar(e: React.FormEvent) {
    e.preventDefault();
    if (!boardDetail) return;
    const res = await fetch(`/api/boards/${boardDetail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ createVirtualVariable: newVirtualVarForm }),
    });
    if (res.ok) {
      setNewVirtualVarForm({
        code: "",
        name: "",
        formula: "",
        unit: "kW",
        description: "",
        currentValue: "38.5",
      });
      showToast("Variable virtual guardada en el motor de cálculo");
      void fetchBoardAndTelemetry();
    }
  }

  async function handleSimulatePacketIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!boardDetail || boardDetail.devices.length === 0) return;
    const dev = boardDetail.devices[0];
    const topic = `${boardDetail.tenantId}/${boardDetail.projectId}/${boardDetail.id}/${dev.id}/${ingestTestForm.variable}`;

    const payload =
      ingestTestForm.protocol === "MQTT_TOPIC"
        ? {
            mqttTopic: topic,
            payload: { value: Number(ingestTestForm.value) },
          }
        : {
            variable: ingestTestForm.variable,
            value: Number(ingestTestForm.value),
            latencyMs: 11,
          };

    const res = await fetch("/api/telemetry/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": dev.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showToast(
        `Payload inyectado vía ${ingestTestForm.protocol} (${ingestTestForm.variable} = ${ingestTestForm.value})`
      );
      void fetchBoardAndTelemetry();
    }
  }

  function handleExportExecutivePdf() {
    if (!boardDetail) return;
    const sTotal =
      boardDetail.virtualVariables.find((v) => v.code === "S_TOTAL_KVA")?.currentValue ?? 42.5;
    const unbalance =
      boardDetail.virtualVariables.find((v) => v.code === "V_UNBALANCE_PCT")?.currentValue ?? 0.6;
    const costClp =
      boardDetail.virtualVariables.find((v) => v.code === "COST_CLP")?.currentValue ??
      Math.round(boardDetail.energyAccumulatedKwh * boardDetail.tariffClpPerKwh);

    const fileName = generateExecutivePdfReport({
      tenantName: boardDetail.tenant.name,
      tenantRut: boardDetail.tenant.rut,
      projectName: boardDetail.project.name,
      projectLocation: boardDetail.project.location,
      boardName: boardDetail.name,
      boardCode: boardDetail.code,
      normative: boardDetail.normative,
      plcModel: boardDetail.plcModel,
      gatewayModel: boardDetail.gatewayModel,
      operationalStatus: boardDetail.operationalStatus,
      gatewayStatus: boardDetail.effectiveGatewayStatus,
      latencyMs: boardDetail.latencyMs,
      energyKwh: boardDetail.energyAccumulatedKwh,
      tariffClp: boardDetail.tariffClpPerKwh,
      costClp,
      apparentPowerKva: sTotal,
      unbalancePct: unbalance,
      stats: telemetryStats,
      hourMeters: boardDetail.hourMeters,
      alarms: boardDetail.alarms,
      logs: boardDetail.maintenanceLogs,
    });

    showToast(`Reporte Ejecutivo PDF generado: ${fileName}`);
  }

  async function handleAdminCreateEntity(
    entityType: "TENANT" | "PROJECT" | "BOARD",
    e: React.FormEvent
  ) {
    e.preventDefault();
    let payload: Record<string, string> = { entityType };
    if (entityType === "TENANT") {
      payload = { entityType, ...adminNewTenant };
    } else if (entityType === "PROJECT") {
      payload = { entityType, tenantId: selectedTenantId, ...adminNewProject };
    } else if (entityType === "BOARD") {
      payload = {
        entityType,
        tenantId: selectedTenantId,
        projectId: selectedProjectId,
        ...adminNewBoard,
      };
    }

    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showToast(`Registro ${entityType} creado exitosamente por Super-Admin`);
      void fetchHierarchy();
    }
  }

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3 font-mono">
          <Zap className="w-10 h-10 text-cyan-400 animate-pulse mx-auto" />
          <div className="text-sm text-white">
            CARGANDO CONSOLA SCADA / TELEMETRÍA REDVOLT...
          </div>
          <div className="text-xs text-slate-400">
            Verificando aislamiento Multi-Tenant y sincronizando series de tiempo PostgreSQL
          </div>
        </div>
      </div>
    );
  }

  const currentTenant = tenants.find((t) => t.id === selectedTenantId);
  const currentProject = currentTenant?.projects.find((p) => p.id === selectedProjectId);

  const analogSensors =
    boardDetail?.sensorVariables.filter((s) => s.dataType === "ANALOG") || [];
  const digitalSensors =
    boardDetail?.sensorVariables.filter((s) => s.dataType === "DIGITAL") || [];
  const activeAlarmsCount =
    boardDetail?.alarms.filter((a) => a.status === "ACTIVE").length || 0;

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col">
      {/* Top Bar SCADA Sala de Control 24/7 */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-lg bg-[#1E293B] border border-cyan-500/40 flex items-center justify-center hover:border-cyan-400 transition-colors"
            title="Ir al Portal Corporativo Público"
          >
            <Zap className="w-5 h-5 text-cyan-400" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight text-sm sm:text-base">
                REDVOLT SCADA / IIoT
              </span>
              <span
                id="badge-user-role"
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                  session?.role === "SUPER_ADMIN"
                    ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                }`}
              >
                {session?.role === "SUPER_ADMIN"
                  ? "ROL: SUPER-ADMIN REDVOLT"
                  : `CLIENTE AISLADO: ${session?.tenantName}`}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Operador: {session?.fullName} ({session?.email})
            </div>
          </div>
        </div>

        {/* Estado Global Watchdog + Botón Exportar Reporte Ejecutivo PDF */}
        <div className="flex flex-wrap items-center gap-3">
          {boardDetail && (
            <div
              id="watchdog-status-indicator"
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                boardDetail.effectiveGatewayStatus === "ONLINE"
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                  : "bg-red-500/15 border-red-500/40 text-red-300"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  boardDetail.effectiveGatewayStatus === "ONLINE"
                    ? "bg-emerald-400 animate-ping"
                    : "bg-red-500"
                }`}
              />
              <span>
                WATCHDOG: <strong>{boardDetail.effectiveGatewayStatus}</strong>
              </span>
              <span className="text-slate-500">|</span>
              <span>{boardDetail.latencyMs} ms</span>
              <span className="hidden md:inline text-slate-500">|</span>
              <span className="hidden md:inline text-slate-300">
                HB:{" "}
                {new Date(boardDetail.lastHeartbeat).toLocaleTimeString("es-CL", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          )}

          <button
            id="btn-export-executive-pdf"
            type="button"
            onClick={handleExportExecutivePdf}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#F97316] hover:bg-orange-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow"
          >
            <FileDown className="w-4 h-4" />
            <span>Exportar Reporte Ejecutivo PDF</span>
          </button>

          <button
            id="btn-logout"
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Barra de Navegación Jerárquica: Cliente -> Proyecto / Instalación -> Tablero / Equipo */}
      <div className="bg-[#1E293B] border-b border-slate-800 px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Nivel 1: Cliente (Tenant) */}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-[11px] font-mono uppercase text-slate-400">
                1. Cliente:
              </span>
              <select
                id="select-hierarchy-tenant"
                value={selectedTenantId}
                onChange={(e) => handleSelectTenant(e.target.value)}
                className="bg-[#0F172A] border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.rut})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-600 font-mono">→</span>

            {/* Nivel 2: Proyecto / Instalación */}
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-[11px] font-mono uppercase text-slate-400">
                2. Instalación:
              </span>
              <select
                id="select-hierarchy-project"
                value={selectedProjectId}
                onChange={(e) => handleSelectProject(e.target.value)}
                className="bg-[#0F172A] border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              >
                {currentTenant?.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-600 font-mono">→</span>

            {/* Nivel 3: Tablero / Equipo */}
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-mono uppercase text-slate-400">
                3. Tablero:
              </span>
              <select
                id="select-hierarchy-board"
                value={selectedBoardId}
                onChange={(e) => setSelectedBoardId(e.target.value)}
                className="bg-[#0F172A] border border-cyan-500/50 rounded px-2.5 py-1.5 text-xs font-mono font-semibold text-cyan-300 focus:outline-none focus:border-cyan-400"
              >
                {currentProject?.boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} [{b.code}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estado Operativo del Tablero */}
          {boardDetail && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">ESTADO ACTIVO:</span>
              <select
                id="select-operational-status"
                value={boardDetail.operationalStatus}
                onChange={(e) =>
                  handleChangeOperationalStatus(
                    e.target.value as "OPERATIVO" | "EN_MANTENCION" | "FUERA_DE_SERVICIO"
                  )
                }
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded border cursor-pointer ${
                  boardDetail.operationalStatus === "OPERATIVO"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                    : boardDetail.operationalStatus === "EN_MANTENCION"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-red-500/20 text-red-300 border-red-500/40"
                }`}
              >
                <option value="OPERATIVO" className="bg-slate-900 text-emerald-300">
                  ● OPERATIVO
                </option>
                <option value="EN_MANTENCION" className="bg-slate-900 text-amber-300">
                  ◐ EN MANTENCIÓN
                </option>
                <option value="FUERA_DE_SERVICIO" className="bg-slate-900 text-red-300">
                  ○ FUERA DE SERVICIO
                </option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Notificación flotante Toast */}
      {statusToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-cyan-500/60 text-cyan-200 px-4 py-3 rounded-lg shadow-2xl text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Contenido Principal del Tablero Seleccionado */}
      {boardDetail && (
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
          {/* Cabecera Técnica del Tablero + Watchdog / Heartbeat Detallado */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {boardDetail.code}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {boardDetail.normative}
                </span>
              </div>
              <h1 id="active-board-title" className="text-xl sm:text-2xl font-bold text-white">
                {boardDetail.tenant.name} — {boardDetail.name}
              </h1>
              <p className="text-xs font-mono text-slate-300">
                Instalación: <span className="text-cyan-300">{boardDetail.project.name}</span> (
                {boardDetail.project.location}) • PLC/Medición:{" "}
                <span className="text-orange-300">{boardDetail.plcModel}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="bg-[#0F172A] border border-slate-800 rounded-lg px-3 py-2">
                <span className="text-[10px] text-slate-400 block">ESTADO GATEWAY</span>
                <span className="text-emerald-400 font-bold">
                  {boardDetail.effectiveGatewayStatus} ({boardDetail.latencyMs} ms)
                </span>
              </div>
              <div className="bg-[#0F172A] border border-slate-800 rounded-lg px-3 py-2">
                <span className="text-[10px] text-slate-400 block">ENERGÍA ACUMULADA</span>
                <span className="text-cyan-300 font-bold">
                  {boardDetail.energyAccumulatedKwh.toLocaleString("es-CL")} kWh
                </span>
              </div>
              <div className="bg-[#0F172A] border border-slate-800 rounded-lg px-3 py-2">
                <span className="text-[10px] text-slate-400 block">COSTO REFERENCIAL</span>
                <span className="text-orange-400 font-bold">
                  $
                  {Math.round(
                    boardDetail.energyAccumulatedKwh * boardDetail.tariffClpPerKwh
                  ).toLocaleString("es-CL")}{" "}
                  CLP
                </span>
              </div>
              <div className="bg-[#0F172A] border border-slate-800 rounded-lg px-3 py-2">
                <span className="text-[10px] text-slate-400 block">ALARMAS ACTIVAS</span>
                <span
                  className={`font-bold ${
                    activeAlarmsCount > 0 ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {activeAlarmsCount} Activas
                </span>
              </div>
            </div>
          </div>

          {/* Pestañas de Módulos SCADA y O&M */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
            <button
              id="tab-scada"
              type="button"
              onClick={() => setActiveTab("scada")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                activeTab === "scada"
                  ? "bg-cyan-500 text-slate-950"
                  : "bg-[#1E293B] text-slate-300 hover:bg-slate-800 border border-slate-700"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>1. Telemetría SCADA &amp; Variables Virtuales</span>
            </button>

            <button
              id="tab-alarms"
              type="button"
              onClick={() => setActiveTab("alarms")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                activeTab === "alarms"
                  ? "bg-cyan-500 text-slate-950"
                  : "bg-[#1E293B] text-slate-300 hover:bg-slate-800 border border-slate-700"
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>2. Alarmas y Eventos ({activeAlarmsCount})</span>
            </button>

            <button
              id="tab-hourmeters"
              type="button"
              onClick={() => setActiveTab("om_hourmeters")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                activeTab === "om_hourmeters"
                  ? "bg-cyan-500 text-slate-950"
                  : "bg-[#1E293B] text-slate-300 hover:bg-slate-800 border border-slate-700"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>3. Horómetros &amp; Mantenimiento Predictivo</span>
            </button>

            <button
              id="tab-documents"
              type="button"
              onClick={() => setActiveTab("documents")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                activeTab === "documents"
                  ? "bg-cyan-500 text-slate-950"
                  : "bg-[#1E293B] text-slate-300 hover:bg-slate-800 border border-slate-700"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>
                4. Documentación Técnica ({boardDetail.technicalDocuments.length})
              </span>
            </button>

            <button
              id="tab-logbook"
              type="button"
              onClick={() => setActiveTab("logbook")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                activeTab === "logbook"
                  ? "bg-cyan-500 text-slate-950"
                  : "bg-[#1E293B] text-slate-300 hover:bg-slate-800 border border-slate-700"
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>
                5. Bitácora de Terreno ({boardDetail.maintenanceLogs.length})
              </span>
            </button>

            <button
              id="tab-ingest"
              type="button"
              onClick={() => setActiveTab("ingest")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                activeTab === "ingest"
                  ? "bg-cyan-500 text-slate-950"
                  : "bg-[#1E293B] text-slate-300 hover:bg-slate-800 border border-slate-700"
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>6. Ingesta MQTT / REST &amp; Watchdog</span>
            </button>

            {session?.role === "SUPER_ADMIN" && (
              <button
                id="tab-admin"
                type="button"
                onClick={() => setActiveTab("admin")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  activeTab === "admin"
                    ? "bg-orange-500 text-slate-950"
                    : "bg-orange-500/15 text-orange-300 hover:bg-orange-500/25 border border-orange-500/40"
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>7. Ingeniería Super-Admin (CRUD Multi-Tenant)</span>
              </button>
            )}
          </div>

          {/* ===================================================================== */}
          {/* PESTAÑA 1: DASHBOARD SCADA / TELEMETRÍA EN TIEMPO REAL                */}
          {/* ===================================================================== */}
          {activeTab === "scada" && (
            <div className="space-y-6">
              {/* Medidores Tipo Gauge (Arco) con cambio dinámico según umbrales */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-mono uppercase tracking-wider text-cyan-400">
                    MEDIDORES TIPO GAUGE &amp; TARJETAS KPI EN TIEMPO REAL (MUESTREO 3S)
                  </h2>
                  <span className="text-xs font-mono text-slate-400">
                    Umbrales dinámicos: Verde (Normal) • Amarillo (Advertencia) • Rojo (Crítico)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  {analogSensors.slice(0, 5).map((sensor) => {
                    const isVoltage = sensor.code.startsWith("V_");
                    const isCurrent = sensor.code.startsWith("I_");
                    const minRange = isVoltage ? 195 : isCurrent ? 0 : 48;
                    const maxRange = isVoltage
                      ? 245
                      : isCurrent
                      ? Math.round((sensor.critHigh || 120) * 1.15)
                      : 52;
                    return (
                      <RadialGauge
                        key={sensor.id}
                        code={sensor.code}
                        label={sensor.name}
                        value={sensor.currentValue}
                        unit={sensor.unit}
                        min={minRange}
                        max={maxRange}
                        warnLow={sensor.warnLow}
                        warnHigh={sensor.warnHigh}
                        critLow={sensor.critLow}
                        critHigh={sensor.critHigh}
                      />
                    );
                  })}
                </div>

                {/* Segunda fila de Gauges / KPIs Analógicos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {analogSensors.slice(5).map((sensor) => {
                    const isCurrent = sensor.code.startsWith("I_");
                    const isFreq = sensor.code === "FREQ";
                    const isPf = sensor.code === "PF";
                    const minRange = isCurrent ? 0 : isFreq ? 48.5 : isPf ? 0.8 : 15;
                    const maxRange = isCurrent
                      ? Math.round((sensor.critHigh || 120) * 1.15)
                      : isFreq
                      ? 51.5
                      : isPf
                      ? 1.0
                      : 80;
                    return (
                      <RadialGauge
                        key={sensor.id}
                        code={sensor.code}
                        label={sensor.name}
                        value={sensor.currentValue}
                        unit={sensor.unit}
                        min={minRange}
                        max={maxRange}
                        warnLow={sensor.warnLow}
                        warnHigh={sensor.warnHigh}
                        critLow={sensor.critLow}
                        critHigh={sensor.critHigh}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Gráficos Interactivos de Series de Tiempo (L1, L2, L3) + Selector de Rango + Descarga CSV */}
              <TimeSeriesChart
                boardCode={boardDetail.code}
                series={telemetrySeries}
                selectedRange={selectedRange}
                onRangeChange={setSelectedRange}
                customFrom={customFrom}
                customTo={customTo}
                onCustomFromChange={setCustomFrom}
                onCustomToChange={setCustomTo}
                onDownloadCsv={() =>
                  exportTelemetryToCsv(boardDetail.code, telemetrySeries)
                }
              />

              {/* Indicadores de Estado Digital (Lámparas Piloto Virtuales) + Motor de Variables Virtuales */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Lámparas Piloto Virtuales */}
                <div className="lg:col-span-6 bg-[#1E293B] border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[11px] font-mono text-cyan-400 uppercase">
                        ENTRADAS / SALIDAS DIGITALES PLC
                      </span>
                      <h3 className="text-base font-bold text-white">
                        Lámparas Piloto Virtuales de Estado Operativo
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {digitalSensors.length} Canales DI/DO
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {digitalSensors.map((ds) => (
                      <PilotLamp
                        key={ds.id}
                        code={ds.code}
                        name={ds.name}
                        value={ds.currentValue}
                        onToggle={handleToggleDigital}
                      />
                    ))}
                  </div>
                </div>

                {/* Motor de Variables Virtuales y Cálculos */}
                <div className="lg:col-span-6 bg-[#1E293B] border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[11px] font-mono text-orange-400 uppercase flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5" />
                        MOTOR DE VARIABLES VIRTUALES Y CÁLCULOS EN TIEMPO REAL
                      </span>
                      <h3 className="text-base font-bold text-white">
                        Variables Calculadas sobre Telemetría Cruda
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {boardDetail.virtualVariables.map((vv) => (
                      <div
                        key={vv.id}
                        className="bg-[#0F172A] border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-cyan-400 uppercase">
                              {vv.code}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                              {vv.formula}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-white mt-1">
                            {vv.name}
                          </div>
                        </div>

                        <div className="my-2 text-2xl font-mono font-bold text-orange-400">
                          {vv.unit === "CLP"
                            ? `$${Math.round(vv.currentValue).toLocaleString("es-CL")}`
                            : vv.currentValue.toLocaleString("es-CL")}{" "}
                          <span className="text-xs font-normal text-slate-400">
                            {vv.unit}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400">{vv.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* PESTAÑA 2: GESTIÓN DE ALARMAS Y EVENTOS CON RECONOCIMIENTO (ACK)      */}
          {/* ===================================================================== */}
          {activeTab === "alarms" && (
            <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono text-orange-400 uppercase">
                    SUPERVISIÓN DE UMBRALES Y RECONOCIMIENTO DE OPERADOR (ISA-18.2)
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    Panel de Alarmas Activas e Históricas — {boardDetail.code}
                  </h2>
                </div>

                <button
                  id="btn-trigger-test-alarm"
                  type="button"
                  onClick={handleTriggerTestAlarm}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-mono font-semibold transition-colors cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Simular Alarma de Sobretensión (Prueba ACK)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400 bg-[#0F172A]">
                      <th className="py-3 px-4">Fecha / Hora</th>
                      <th className="py-3 px-4">Severidad</th>
                      <th className="py-3 px-4">Variable</th>
                      <th className="py-3 px-4">Valor Medido / Umbral</th>
                      <th className="py-3 px-4">Descripción del Evento</th>
                      <th className="py-3 px-4">Estado / Auditoría ACK</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {boardDetail.alarms.map((alarm) => (
                      <tr key={alarm.id} className="hover:bg-slate-900/50">
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          {new Date(alarm.triggeredAt).toLocaleString("es-CL")}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded font-bold text-[10px] border ${
                              alarm.severity === "CRITICAL"
                                ? "bg-red-500/20 text-red-300 border-red-500/40"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            }`}
                          >
                            {alarm.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-cyan-300 font-semibold">
                          {alarm.variableCode} ({alarm.variableName})
                        </td>
                        <td className="py-3 px-4 text-white">
                          <strong>
                            {alarm.measuredValue} {alarm.unit}
                          </strong>{" "}
                          <span className="text-slate-400">
                            (Límite: {alarm.thresholdValue} {alarm.unit})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-sans">
                          {alarm.message}
                        </td>
                        <td className="py-3 px-4">
                          {alarm.status === "ACTIVE" ? (
                            <span className="text-amber-400 font-semibold">
                              ● ACTIVA (SIN ACK)
                            </span>
                          ) : (
                            <div className="text-emerald-400">
                              <div>✓ RECONOCIDA (ACK)</div>
                              <div className="text-[10px] text-slate-400">
                                Por: {alarm.ackedByName}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {alarm.status === "ACTIVE" ? (
                            <button
                              type="button"
                              onClick={() => handleAckAlarm(alarm.id)}
                              className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                            >
                              Reconocer (ACK)
                            </button>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Auditada</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* PESTAÑA 3: MANTENIMIENTO PREDICTIVO Y HORÓMETROS VIRTUALES            */}
          {/* ===================================================================== */}
          {activeTab === "om_hourmeters" && (
            <div className="space-y-5">
              <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
                  <div>
                    <span className="text-xs font-mono text-cyan-400 uppercase">
                      CONTADORES AUTOMÁTICOS DE OPERACIÓN BAJO CARGA
                    </span>
                    <h2 className="text-lg font-bold text-white">
                      Mantenimiento Predictivo y Horómetros Virtuales
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded">
                    Incremento Automático Activo (Corriente &gt; Umbral)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {boardDetail.hourMeters.map((hm) => {
                    const pct = Math.min(
                      100,
                      +((hm.accumulatedHours / hm.maintenanceTargetHours) * 100).toFixed(1)
                    );
                    const isNearMaintenance =
                      hm.accumulatedHours >= hm.warningHoursThreshold;

                    return (
                      <div
                        key={hm.id}
                        className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-xs font-mono text-cyan-400">
                              {hm.code} • Disparo: {hm.triggerVariableCode} &gt;{" "}
                              {hm.triggerThreshold}
                            </span>
                            <h3 className="text-base font-bold text-white mt-0.5">
                              {hm.equipmentName}
                            </h3>
                          </div>
                          <span
                            className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded border ${
                              isNearMaintenance
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                            }`}
                          >
                            {isNearMaintenance
                              ? "ALERTA TEMPRANA MANTENCIÓN"
                              : "DENTRO DE CICLO PREVENTIVO"}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between font-mono">
                          <div className="text-2xl font-bold text-white">
                            {hm.accumulatedHours.toLocaleString("es-CL")}{" "}
                            <span className="text-sm font-normal text-slate-400">
                              / {hm.maintenanceTargetHours.toLocaleString("es-CL")} hrs
                              para mantención preventiva
                            </span>
                          </div>
                          <span className="text-sm font-bold text-cyan-400">{pct}%</span>
                        </div>

                        {/* Barra de progreso hacia el próximo mantenimiento preventivo */}
                        <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isNearMaintenance ? "bg-orange-500" : "bg-cyan-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
                          <span>
                            Restante:{" "}
                            <strong className="text-slate-200">
                              {Math.max(
                                0,
                                +(hm.maintenanceTargetHours - hm.accumulatedHours).toFixed(1)
                              )}{" "}
                              hrs
                            </strong>
                          </span>
                          <span className="text-emerald-400">
                            {hm.isRunning ? "● Contando en línea" : "○ Equipo en Standby"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* PESTAÑA 4: GESTIÓN DOCUMENTAL Y PASAPORTE DIGITAL DEL TABLERO         */}
          {/* ===================================================================== */}
          {activeTab === "documents" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-[#1E293B] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-mono text-cyan-400 uppercase">
                      PASAPORTE DIGITAL DEL ACTIVO — NORMATIVA RIC / SEC
                    </span>
                    <h2 className="text-lg font-bold text-white">
                      Repositorio Técnico del Tablero ({boardDetail.code})
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Estado: <strong>{boardDetail.operationalStatus}</strong>
                  </span>
                </div>

                <div className="space-y-3">
                  {boardDetail.technicalDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            {doc.category}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {doc.code} • {doc.version} • {doc.fileSize}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white">{doc.title}</h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {doc.summary}
                        </p>
                        <div className="text-[11px] font-mono text-slate-500 pt-1">
                          Subido por {doc.uploadedBy} el{" "}
                          {new Date(doc.uploadedAt).toLocaleDateString("es-CL")}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Visualizar Ficha / Plano</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulario para Cargar Nuevo Documento / Plano al Pasaporte Digital */}
              <div className="lg:col-span-4 bg-[#1E293B] border border-slate-800 rounded-xl p-5">
                <h3 className="text-base font-bold text-white mb-1">
                  Subir Plano o Certificado al Tablero
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Incorpore diagramas unilineales, planos de control, listados de materiales (BOM),
                  certificados de calibración o termografías.
                </p>

                <form onSubmit={handleCreateDocument} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                      Título del Documento / Plano *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Listado de Materiales (BOM) Celda Fuerza"
                      value={newDocForm.title}
                      onChange={(e) =>
                        setNewDocForm({ ...newDocForm, title: e.target.value })
                      }
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                        Categoría *
                      </label>
                      <select
                        value={newDocForm.category}
                        onChange={(e) =>
                          setNewDocForm({ ...newDocForm, category: e.target.value })
                        }
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      >
                        <option value="UNILINEAL">UNILINEAL (PDF)</option>
                        <option value="PLANO_CONTROL">PLANO CONTROL</option>
                        <option value="BOM">LISTADO BOM</option>
                        <option value="CERTIFICADO_CALIBRACION">
                          CERT. CALIBRACIÓN
                        </option>
                        <option value="TERMOGRAFIA">TERMOGRAFÍA</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                        Versión / Rev.
                      </label>
                      <input
                        type="text"
                        value={newDocForm.version}
                        onChange={(e) =>
                          setNewDocForm({ ...newDocForm, version: e.target.value })
                        }
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                      Resumen Técnico / Alcance
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Descripción técnica del plano o protocolo de pruebas..."
                      value={newDocForm.summary}
                      onChange={(e) =>
                        setNewDocForm({ ...newDocForm, summary: e.target.value })
                      }
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Incorporar al Pasaporte Digital</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Modal de Visualización de Plano / Documento Técnico */}
          {previewDoc && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#1E293B] border border-cyan-500/50 rounded-xl max-w-3xl w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-mono text-cyan-400">
                      VISOR DE DOCUMENTACIÓN TÉCNICA • {previewDoc.code} ({previewDoc.version})
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {previewDoc.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-mono cursor-pointer"
                  >
                    Cerrar [X]
                  </button>
                </div>

                {/* Esquema Unilineal Vectorial Representativo */}
                <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5 font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                    <span>TABLERO: {boardDetail.name} ({boardDetail.code})</span>
                    <span>NORMA: {boardDetail.normative}</span>
                  </div>
                  <p className="text-slate-200 font-sans leading-relaxed">
                    {previewDoc.summary}
                  </p>
                  <div className="p-4 bg-slate-950 rounded border border-slate-800 text-cyan-300 overflow-x-auto">
                    <pre className="text-[11px] leading-5">
{`[RED 3x380V/220V 50Hz] ───┬─── [52G Interruptor General Caja Moldeada 250A]
                          │
                     [BARRA COBRE ELECTROLÍTICO L1 / L2 / L3 + N + PE]
                          ├───► [TC 250/5A Clase 0.5S] ──► [Analizador SENTRON PAC3220]
                          ├───► [PLC Siemens S7-1215C] ──► [Gateway CBOX IIoT MQTT/REST]
                          └───► [Transformador Aislación Quirófanos 10kVA + Vigía Bender]`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* PESTAÑA 5: BITÁCORA DE MANTENCIONES EN TERRENO                        */}
          {/* ===================================================================== */}
          {activeTab === "logbook" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-[#1E293B] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-xs font-mono text-cyan-400 uppercase">
                    TRAZABILIDAD HISTÓRICA DE INTERVENCIONES O&amp;M
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    Bitácora de Mantenciones en Terreno — {boardDetail.code}
                  </h2>
                </div>

                <div className="space-y-3">
                  {boardDetail.maintenanceLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
                          {log.maintenanceType}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {new Date(log.performedAt).toLocaleString("es-CL")}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-cyan-300 font-semibold">
                        Técnico Responsable: {log.technicianName}
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {log.details}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulario para Registrar Nueva Intervención en Bitácora */}
              <div className="lg:col-span-5 bg-[#1E293B] border border-slate-800 rounded-xl p-5">
                <h3 className="text-base font-bold text-white mb-1">
                  Registrar Nueva Intervención en Terreno
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Toda actividad queda vinculada al historial técnico del tablero e incluida en el
                  Reporte Ejecutivo PDF.
                </p>

                <form id="form-new-logbook" onSubmit={handleCreateMaintenanceLog} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                      Fecha y Hora de Intervención *
                    </label>
                    <input
                      id="log-date"
                      type="datetime-local"
                      required
                      value={newLogForm.performedAt}
                      onChange={(e) =>
                        setNewLogForm({ ...newLogForm, performedAt: e.target.value })
                      }
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                      Técnico / Ingeniero Responsable *
                    </label>
                    <input
                      id="log-tech"
                      type="text"
                      required
                      value={newLogForm.technicianName}
                      onChange={(e) =>
                        setNewLogForm({ ...newLogForm, technicianName: e.target.value })
                      }
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                      Tipo de Mantención *
                    </label>
                    <select
                      id="log-type"
                      value={newLogForm.maintenanceType}
                      onChange={(e) =>
                        setNewLogForm({ ...newLogForm, maintenanceType: e.target.value })
                      }
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    >
                      <option value="PREVENTIVA">PREVENTIVA</option>
                      <option value="CORRECTIVA">CORRECTIVA</option>
                      <option value="CALIBRACION">CALIBRACIÓN</option>
                      <option value="MODIFICACION_LOGICA">MODIFICACIÓN DE LÓGICA PLC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                      Detalle Técnico Ejecutado *
                    </label>
                    <textarea
                      id="log-details"
                      rows={4}
                      required
                      placeholder="Ej. Calibración de analizador de red y reapriete de borneras de fuerza..."
                      value={newLogForm.details}
                      onChange={(e) =>
                        setNewLogForm({ ...newLogForm, details: e.target.value })
                      }
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <button
                    id="btn-submit-logbook"
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#F97316] hover:bg-orange-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Guardar Registro en Bitácora
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* PESTAÑA 6: BACKEND DE INGESTA MULTI-PROTOCOLO (MQTT / REST API)       */}
          {/* ===================================================================== */}
          {activeTab === "ingest" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-[#1E293B] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-xs font-mono text-cyan-400 uppercase">
                    ARQUITECTURA DE COMUNICACIÓN OT/IT EN VIVO
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    Credenciales de Gateway IIoT, Tópicos MQTT y Watchdog
                  </h2>
                </div>

                {boardDetail.devices.map((dev) => (
                  <div
                    key={dev.id}
                    className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-300 font-bold">{dev.name}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {dev.protocol}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                      <div>
                        <span className="text-slate-500">Dirección IP OT: </span>
                        {dev.ipAddress}
                      </div>
                      <div>
                        <span className="text-slate-500">Firmware Edge: </span>
                        {dev.firmware}
                      </div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400">
                        ESTRUCTURA DE TÓPICO MQTT ESTANDARIZADO:
                      </div>
                      <code className="text-cyan-400 break-all">
                        {dev.mqttTopicPrefix}/&lt;variable_code&gt;
                      </code>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400">
                        API KEY DEL DISPOSITIVO (Header x-api-key en POST /api/telemetry/ingest):
                      </div>
                      <code className="text-orange-400 break-all">{dev.apiKey}</code>
                    </div>
                  </div>
                ))}
              </div>

              {/* Inyector Manual para Probar Ingesta Multi-Protocolo */}
              <div className="lg:col-span-5 bg-[#1E293B] border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-base font-bold text-white">
                  Consola de Prueba de Ingesta (MQTT / REST API)
                </h3>
                <p className="text-xs text-slate-400">
                  Envíe una lectura en tiempo real hacia <code className="text-cyan-300">POST /api/telemetry/ingest</code> autenticada con la API Key del Gateway.
                </p>

                <form onSubmit={handleSimulatePacketIngest} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                      Protocolo de Transporte
                    </label>
                    <select
                      value={ingestTestForm.protocol}
                      onChange={(e) =>
                        setIngestTestForm({ ...ingestTestForm, protocol: e.target.value })
                      }
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    >
                      <option value="MQTT_TOPIC">
                        Tópico MQTT (tenant_id/proyecto_id/tablero_id/dispositivo_id/variable)
                      </option>
                      <option value="REST_API">
                        API REST JSON (POST /api/telemetry/ingest + x-api-key)
                      </option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                        Variable Destino
                      </label>
                      <select
                        value={ingestTestForm.variable}
                        onChange={(e) =>
                          setIngestTestForm({ ...ingestTestForm, variable: e.target.value })
                        }
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      >
                        <option value="V_L1">V_L1 (Voltaje L1)</option>
                        <option value="V_L2">V_L2 (Voltaje L2)</option>
                        <option value="V_L3">V_L3 (Voltaje L3)</option>
                        <option value="I_L1">I_L1 (Corriente L1)</option>
                        <option value="FREQ">FREQ (Frecuencia Hz)</option>
                        <option value="TEMP_BARRAS">TEMP_BARRAS (°C)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                        Valor Numérico
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={ingestTestForm.value}
                        onChange={(e) =>
                          setIngestTestForm({ ...ingestTestForm, value: e.target.value })
                        }
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Transmitir Paquete al Motor de Ingesta</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* PESTAÑA 7: CONSOLA SUPER-ADMIN (CRUD CLIENTES, ACTIVOS Y VIRTUALES)   */}
          {/* ===================================================================== */}
          {activeTab === "admin" && session?.role === "SUPER_ADMIN" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Alta de Empresa Cliente (Tenant) */}
                <form
                  onSubmit={(e) => handleAdminCreateEntity("TENANT", e)}
                  className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 space-y-3"
                >
                  <div className="text-xs font-mono text-orange-400 uppercase">
                    SUPER-ADMIN • PASO 1
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Alta de Nueva Empresa Cliente (Tenant)
                  </h3>
                  <input
                    type="text"
                    required
                    placeholder="Razón Social Cliente"
                    value={adminNewTenant.name}
                    onChange={(e) =>
                      setAdminNewTenant({ ...adminNewTenant, name: e.target.value })
                    }
                    className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="RUT Empresa (Ej. 76.999.111-2)"
                    value={adminNewTenant.rut}
                    onChange={(e) =>
                      setAdminNewTenant({ ...adminNewTenant, rut: e.target.value })
                    }
                    className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Correo Operaciones Cliente"
                    value={adminNewTenant.contactEmail}
                    onChange={(e) =>
                      setAdminNewTenant({ ...adminNewTenant, contactEmail: e.target.value })
                    }
                    className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Crear Cliente Multi-Tenant
                  </button>
                </form>

                {/* 2. Alta de Proyecto / Instalación */}
                <form
                  onSubmit={(e) => handleAdminCreateEntity("PROJECT", e)}
                  className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 space-y-3"
                >
                  <div className="text-xs font-mono text-cyan-400 uppercase">
                    SUPER-ADMIN • PASO 2
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Crear Proyecto en {currentTenant?.name}
                  </h3>
                  <input
                    type="text"
                    required
                    placeholder="Nombre Instalación (Ej. Sala Calderas)"
                    value={adminNewProject.name}
                    onChange={(e) =>
                      setAdminNewProject({ ...adminNewProject, name: e.target.value })
                    }
                    className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Código Proyecto (Ej. INST-SC-02)"
                    value={adminNewProject.code}
                    onChange={(e) =>
                      setAdminNewProject({ ...adminNewProject, code: e.target.value })
                    }
                    className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Ubicación Física"
                    value={adminNewProject.location}
                    onChange={(e) =>
                      setAdminNewProject({ ...adminNewProject, location: e.target.value })
                    }
                    className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Crear Instalación / Proyecto
                  </button>
                </form>

                {/* 3. Alta de Nuevo Tablero Eléctrico con Sensores Automáticos */}
                <form
                  onSubmit={(e) => handleAdminCreateEntity("BOARD", e)}
                  className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 space-y-3"
                >
                  <div className="text-xs font-mono text-emerald-400 uppercase">
                    SUPER-ADMIN • PASO 3
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Dar de Alta Tablero en {currentProject?.name}
                  </h3>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del Tablero (Ej. Tablero Climatización)"
                    value={adminNewBoard.name}
                    onChange={(e) =>
                      setAdminNewBoard({ ...adminNewBoard, name: e.target.value })
                    }
                    className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Código Único (Ej. TDF-CLIM-03)"
                    value={adminNewBoard.code}
                    onChange={(e) =>
                      setAdminNewBoard({ ...adminNewBoard, code: e.target.value })
                    }
                    className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    required
                    placeholder="PLC / Analizador (Ej. Siemens S7-1200)"
                    value={adminNewBoard.plcModel}
                    onChange={(e) =>
                      setAdminNewBoard({ ...adminNewBoard, plcModel: e.target.value })
                    }
                    className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Dar de Alta Tablero + Sensores IIoT
                  </button>
                </form>
              </div>

              {/* Definición de Nuevas Variables Virtuales para el Tablero */}
              <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5">
                <h3 className="text-base font-bold text-white mb-2">
                  Definir Nueva Variable Virtual Calculada en {boardDetail.code}
                </h3>
                <form
                  onSubmit={handleCreateVirtualVar}
                  className="grid grid-cols-1 sm:grid-cols-5 gap-3"
                >
                  <input
                    type="text"
                    required
                    placeholder="Código (Ej. P_ACTIVA_KW)"
                    value={newVirtualVarForm.code}
                    onChange={(e) =>
                      setNewVirtualVarForm({ ...newVirtualVarForm, code: e.target.value })
                    }
                    className="bg-[#0F172A] border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Nombre Variable"
                    value={newVirtualVarForm.name}
                    onChange={(e) =>
                      setNewVirtualVarForm({ ...newVirtualVarForm, name: e.target.value })
                    }
                    className="bg-[#0F172A] border border-slate-700 rounded px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Fórmula (Ej. S_TOTAL_KVA * PF)"
                    value={newVirtualVarForm.formula}
                    onChange={(e) =>
                      setNewVirtualVarForm({ ...newVirtualVarForm, formula: e.target.value })
                    }
                    className="bg-[#0F172A] border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Unidad (Ej. kW)"
                    value={newVirtualVarForm.unit}
                    onChange={(e) =>
                      setNewVirtualVarForm({ ...newVirtualVarForm, unit: e.target.value })
                    }
                    className="bg-[#0F172A] border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono"
                  />
                  <button
                    type="submit"
                    className="py-2 px-4 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Guardar Variable Virtual
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
