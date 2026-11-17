"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Zap,
  ShieldCheck,
  Cpu,
  Activity,
  Wrench,
  Building2,
  CheckCircle2,
  ArrowRight,
  Lock,
  FileCheck2,
  Gauge,
  Radio,
  Server,
  PhoneCall,
  Mail,
  MapPin,
} from "lucide-react";

const SERVICES = [
  {
    id: "srv-tableros-ric",
    code: "ESP-01 / RIC-SEC",
    title: "1. Diseño, Armado y Certificación de Tableros de Control y Fuerza (Normativa RIC/SEC)",
    subtitle: "Ingeniería de detalle, integración en taller propio y protocolos FAT/SAT bajo Pliegos Técnicos RIC N°01 al N°19.",
    icon: ShieldCheck,
    accent: "cyan",
    specs: [
      "Tableros Generales de Fuerza y Alumbrado (TDF/TDA), Centros de Control de Motores (CCM) y Transferencias Automáticas (TTA).",
      "Cálculo de cortocircuito (IEC 61439), selectividad y coordinación de protecciones, barras de cobre electrolítico estañadas.",
      "Integración de sistemas de tierras clínicas y transformadores de aislación con monitores Bender para recintos hospitalarios (RIC N°11).",
      "Entrega de dossier As-Built, planos EPLAN, pruebas de rigidez dieléctrica y tramitación TE1 ante la SEC.",
    ],
    normativeTag: "Pliegos RIC N°02, N°07, N°11 y N°19 SEC Chile",
  },
  {
    id: "srv-plc-scada",
    code: "ESP-02 / PLC & HMI",
    title: "2. Automatización Industrial y Programación de PLCs (Honeywell, Siemens, Mitsubishi, Haiwell)",
    subtitle: "Control determinístico de procesos críticos, lazos PID, sincronismo de grupos electrógenos y pantallas HMI/SCADA.",
    icon: Cpu,
    accent: "orange",
    specs: [
      "Arquitecturas redundantes y modulares con Siemens SIMATIC (S7-1200 / S7-1500), Honeywell ControlEdge, Mitsubishi MELSEC iQ-R/iQ-F y Haiwell.",
      "Integración de redes de campo industriales: Modbus RTU/TCP, PROFINET, BACnet IP, EtherNet/IP y OPC-UA.",
      "Automatización de estaciones de bombeo con variadores de frecuencia (VDF), plantas de tratamiento y salas de calderas/chillers.",
      "Migración de sistemas obsoletos sin detención de planta y respaldos versionados de lógica de control.",
    ],
    normativeTag: "Estándar IEC 61131-3 & ISA-101 HMI",
  },
  {
    id: "srv-telemetria-iiot",
    code: "ESP-03 / IIoT & ENERGÍA",
    title: "3. Sistemas de Telemetría IIoT y Monitoreo de Calidad de Energía en Tiempo Real",
    subtitle: "Supervisión continua 24/7 estilo SCADA en la nube con ingesta MQTT/REST, horómetros virtuales y alarmas instantáneas.",
    icon: Activity,
    accent: "cyan",
    specs: [
      "Despliegue de analizadores de red Clase 0.5S/0.2S (Siemens SENTRON PAC, Schneider PowerLogic, Circutor) y sensores no invasivos SCT-013.",
      "Gateways IIoT industriales (CBOX, Node-RED Edge, LoRaWAN, 4G/LTE con VPN IPsec) hacia plataforma Redvolt Cloud Multi-Tenant.",
      "Monitoreo de armónicos (THD-V / THD-I), factor de potencia, desbalance de fases, demanda máxima en horas punta y perfil de carga.",
      "Motor de variables virtuales, horómetros predictivos de mantenimiento y generación automática de Reportes Ejecutivos PDF.",
    ],
    normativeTag: "IEEE 519 / EN 50160 / MQTT v5.0 TLS",
  },
  {
    id: "srv-mantenimiento-retrofitting",
    code: "ESP-04 / O&M & RETROFIT",
    title: "4. Mantenimiento Industrial, Diagnóstico Eléctrico y Retrofitting",
    subtitle: "Continuidad operacional para instalaciones críticas, diagnóstico predictivo y modernización integral de celdas y tableros.",
    icon: Wrench,
    accent: "orange",
    specs: [
      "Inspección termográfica infrarroja certificada bajo carga, análisis de calidad de suministro y medición de mallas de puesta a tierra.",
      "Retrofitting de tableros antiguos: reemplazo de aparamenta obsoleta, reordenamiento de peinados de control y actualización a norma RIC.",
      "Calibración en terreno de relés de protección, analizadores de red, sensores de temperatura de barras y transductores de presión.",
      "Contratos de asistencia técnica 24/7 con SLA garantizado y trazabilidad completa en Bitácora Digital del Tablero.",
    ],
    normativeTag: "NETA MTS / NFPA 70B / RIC N°18",
  },
];

const APPLICATION_CASES = [
  {
    tag: "SALUD CRÍTICA — RIC N°11",
    title: "Hospitales y Pabellones Quirúrgicos",
    facility: "Hospital Clínico Regional — Edificio Quirófanos",
    metrics: "220V Trifásico • Latencia 14ms • 99.998% Uptime",
    description:
      "Monitoreo ininterrumpido de tableros generales de quirófanos, bancos de UPS, transformadores de aislación y transferencia automática de grupos electrógenos con trazabilidad SEC.",
  },
  {
    tag: "INFRAESTRUCTURA ELÉCTRICA — RIC N°02",
    title: "Salas Eléctricas y Subestaciones de Poder",
    facility: "Subestaciones Unitarias 15 kV / 0.4 kV & Celdas CCM",
    metrics: "Analizadores PAC3220 • Termografía Continua • THD < 3%",
    description:
      "Supervisión térmica de juegos de barras de cobre, estado de interruptores motorizados (52G), compensación de energía reactiva y alarmas tempranas de sobrecarga.",
  },
  {
    tag: "MINERÍA & PROCESOS CONTINUOS",
    title: "Plantas de Proceso y Estaciones de Bombeo",
    facility: "Estaciones de Impulsión Hidráulica & Variadores VDF",
    metrics: "PLC Mitsubishi / Siemens • Horómetros Predictivos",
    description:
      "Integración de telemetría Modbus/MQTT desde variadores de frecuencia y bombas multietapa, contabilizando horas reales de operación para mantenimiento preventivo antes de falla.",
  },
];

export default function LandingPage() {
  const [formData, setFormData] = useState({
    companyName: "",
    rut: "",
    contactName: "",
    email: "",
    phone: "",
    serviceCategory: "Diseño y Certificación de Tableros (RIC/SEC)",
    facilityType: "Hospital / Clínica / Recinto Asistencial",
    projectDetails: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState<{ folio: string; company: string } | null>(
    null
  );
  const [quoteError, setQuoteError] = useState<string | null>(null);

  async function handleQuoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setQuoteError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuoteError(data.error || "No se pudo enviar la solicitud.");
      } else {
        setQuoteSuccess({
          folio: data.folio,
          company: formData.companyName,
        });
        setFormData({
          companyName: "",
          rut: "",
          contactName: "",
          email: "",
          phone: "",
          serviceCategory: "Diseño y Certificación de Tableros (RIC/SEC)",
          facilityType: "Hospital / Clínica / Recinto Asistencial",
          projectDetails: "",
        });
      }
    } catch {
      setQuoteError("Error de conexión al enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col">
      {/* Barra Técnica Superior */}
      <div className="bg-slate-950 border-b border-slate-800/90 text-[11px] font-mono text-slate-400 py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              NODO SCADA CLOUD CHILE: OPERATIVO (MQTT TLS / REST API)
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline">CUMPLIMIENTO PLIEGOS TÉCNICOS RIC / SEC</span>
          </div>
          <div className="flex items-center gap-4">
            <span>SOPORTE EMERGENCIAS 24/7: +56 2 2940 8800</span>
            <span className="text-slate-600">|</span>
            <span className="text-orange-400">INGENIERIA@REDVOLT.CL</span>
          </div>
        </div>
      </div>

      {/* Header Corporativo */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-slate-900 border border-cyan-500/50 flex items-center justify-center shadow-inner">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-display">
                  REDVOLT
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  SCADA / IIoT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ingeniería Eléctrica, Automatización y Telemetría IIoT
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#servicios" className="hover:text-cyan-400 transition-colors">
              Catálogo de Servicios
            </a>
            <a href="#arquitectura" className="hover:text-cyan-400 transition-colors">
              Arquitectura Telemetría
            </a>
            <a href="#casos" className="hover:text-cyan-400 transition-colors">
              Casos de Aplicación
            </a>
            <a href="#cotizacion" className="hover:text-cyan-400 transition-colors">
              Solicitar Cotización
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              id="btn-acceso-clientes-header"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-semibold text-xs sm:text-sm transition-all shadow-md"
            >
              <Lock className="w-4 h-4" />
              <span>Acceso Clientes / Portal Telemetría</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 border-b border-slate-800 bg-gradient-to-b from-[#0F172A] via-[#0F172A] to-[#1E293B]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#1E293B] border border-slate-700 text-xs font-mono text-cyan-400">
              <FileCheck2 className="w-3.5 h-3.5 text-orange-400" />
              INGENIERÍA ELÉCTRICA CERTIFICADA SEC • AUTOMATIZACIÓN & NUBE INDUSTRIAL
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.12]">
              Continuidad Operacional, Eficiencia Energética y Monitoreo Crítico 24/7.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              Diseñamos, armamos y certificamos tableros eléctricos bajo normativa{" "}
              <strong className="text-white font-semibold">RIC/SEC</strong>, programamos sistemas
              de control con PLCs líderes y conectamos sus activos críticos a nuestra plataforma{" "}
              <strong className="text-cyan-400 font-semibold">SCADA / Telemetría IIoT</strong> con
              diagnóstico predictivo en tiempo real.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/login"
                id="btn-hero-portal-telemetria"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-lg"
              >
                <span>Ingresar al Portal de Telemetría</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#cotizacion"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#1E293B] hover:bg-slate-800 text-white border border-slate-700 font-semibold text-sm transition-colors"
              >
                <span>Solicitar Cotización Técnica</span>
              </a>
            </div>

            {/* Indicadores Técnicos de Confianza */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/90">
              <div>
                <div className="text-2xl font-mono font-bold text-white">RIC / SEC</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Pliegos Técnicos N°01–N°19 Certificados
                </div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-cyan-400">&lt; 25 ms</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Ingesta Telemetría MQTT &amp; REST API
                </div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-orange-400">24/7/365</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Watchdog de Hardware &amp; Horómetros O&amp;M
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Previsualización Técnica de Telemetría en Vivo */}
          <div className="lg:col-span-5">
            <div className="bg-[#1E293B] border border-slate-700/90 rounded-xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block">
                    VISTA PREVIA NODO DEMO EN VIVO
                  </span>
                  <h2 className="text-sm font-bold text-white">
                    Hospital Clínico Regional — TDF-QUIR-01
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE • 14ms
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 font-mono">
                <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-3">
                  <div className="text-[10px] text-slate-400">FASE L1-N</div>
                  <div className="text-lg font-bold text-cyan-400 mt-0.5">221.4 V</div>
                  <div className="text-[11px] text-slate-300">64.5 A</div>
                </div>
                <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-3">
                  <div className="text-[10px] text-slate-400">FASE L2-N</div>
                  <div className="text-lg font-bold text-orange-400 mt-0.5">219.8 V</div>
                  <div className="text-[11px] text-slate-300">61.9 A</div>
                </div>
                <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-3">
                  <div className="text-[10px] text-slate-400">FASE L3-N</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">222.6 V</div>
                  <div className="text-[11px] text-slate-300">66.4 A</div>
                </div>
              </div>

              <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-3.5 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Controlador / Medidor:</span>
                  <span className="text-slate-200">Siemens S7-1215C + PAC3220</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Potencia Aparente (S):</span>
                  <span className="text-cyan-400 font-semibold">42.68 kVA (Cos φ 0.96)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Horómetro Preventivo:</span>
                  <span className="text-orange-400 font-semibold">1.850 / 2.500 hrs (74%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-slate-400">
                  Tópico: <code className="text-cyan-300">tenant/proj/board/dev/#</code>
                </span>
                <Link
                  href="/login"
                  className="text-xs font-mono font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                >
                  Abrir Consola SCADA <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo de Servicios con Fichas Técnicas */}
      <section id="servicios" className="py-20 max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              ESPECIALIDADES DE INGENIERÍA &amp; INTEGRACIÓN
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Catálogo de Servicios con Fichas Técnicas
            </h2>
          </div>
          <p className="text-sm text-slate-400 max-w-md">
            Soluciones llave en mano diseñadas para industrias, hospitales, minería e
            infraestructura crítica bajo normativa chilena vigente.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {SERVICES.map((srv) => {
            const IconComponent = srv.icon;
            const isCyan = srv.accent === "cyan";
            return (
              <div
                key={srv.id}
                className="bg-[#1E293B] border border-slate-800 hover:border-slate-700 rounded-xl p-6 flex flex-col justify-between transition-all shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span
                      className={`text-xs font-mono font-semibold px-2.5 py-1 rounded border ${
                        isCyan
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                          : "bg-orange-500/10 text-orange-400 border-orange-500/30"
                      }`}
                    >
                      FICHA TÉCNICA: {srv.code}
                    </span>
                    <div className="w-10 h-10 rounded-lg bg-[#0F172A] border border-slate-700 flex items-center justify-center">
                      <IconComponent
                        className={`w-5 h-5 ${isCyan ? "text-cyan-400" : "text-orange-400"}`}
                      />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white leading-snug">{srv.title}</h3>
                  <p className="text-sm text-slate-300 mt-2">{srv.subtitle}</p>

                  <ul className="mt-5 space-y-2.5 border-t border-slate-800 pt-4">
                    {srv.specs.map((spec, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isCyan ? "text-cyan-400" : "text-orange-400"
                          }`}
                        />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">{srv.normativeTag}</span>
                  <a
                    href="#cotizacion"
                    className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1"
                  >
                    Cotizar especialidad <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Banda Técnica de Arquitectura Multi-Protocolo */}
      <section
        id="arquitectura"
        className="py-16 bg-[#1E293B]/60 border-y border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5">
              <Gauge className="w-6 h-6 text-cyan-400 mb-3" />
              <div className="text-xs font-mono text-cyan-400">CAPA 01 • CAMPO OT</div>
              <h3 className="text-base font-bold text-white mt-1">
                Instrumentación y PLCs
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Conexión directa a PLCs Siemens, Honeywell, Mitsubishi y Haiwell, analizadores de
                red trifásicos y transformadores de corriente SCT-013.
              </p>
            </div>

            <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5">
              <Radio className="w-6 h-6 text-orange-400 mb-3" />
              <div className="text-xs font-mono text-orange-400">CAPA 02 • EDGE GATEWAY</div>
              <h3 className="text-base font-bold text-white mt-1">
                Ingesta MQTT &amp; REST API
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Tópicos jerárquicos{" "}
                <code className="text-slate-200">tenant/proyecto/tablero/dispositivo/var</code> y
                payloads JSON autenticados con API Key por equipo.
              </p>
            </div>

            <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5">
              <Server className="w-6 h-6 text-cyan-400 mb-3" />
              <div className="text-xs font-mono text-cyan-400">CAPA 03 • AISLAMIENTO B2B</div>
              <h3 className="text-base font-bold text-white mt-1">
                Multi-Tenant PostgreSQL
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Separación estricta de datos por institución (<code className="text-slate-200">tenant_id</code>),
                series de tiempo indexadas y control de acceso basado en roles (RBAC).
              </p>
            </div>

            <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5">
              <FileCheck2 className="w-6 h-6 text-orange-400 mb-3" />
              <div className="text-xs font-mono text-orange-400">CAPA 04 • GESTIÓN O&amp;M</div>
              <h3 className="text-base font-bold text-white mt-1">
                Pasaporte Digital &amp; Reportes PDF
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Planos unilineales As-Built, horómetros predictivos, reconocimiento de alarmas
                (ACK) y exportación instantánea de Reportes Ejecutivos PDF.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Casos de Aplicación */}
      <section id="casos" className="py-20 max-w-7xl mx-auto px-4 sm:px-8">
        <div className="mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-orange-400">
            EXPERIENCIA COMPROBADA EN TERRENO
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            Casos de Aplicación en Infraestructura Crítica
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {APPLICATION_CASES.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-700">
                    {item.tag}
                  </span>
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <div className="text-xs font-mono text-orange-400 mt-1">{item.facility}</div>
                <p className="text-sm text-slate-300 mt-3 leading-relaxed">{item.description}</p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                {item.metrics}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Formulario Funcional de Solicitud de Cotización Técnica */}
      <section
        id="cotizacion"
        className="py-20 bg-[#1E293B]/40 border-t border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-5">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              INGENIERÍA DE PROYECTOS &amp; COTIZACIONES B2B
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Solicitud de Cotización Técnica y Visita a Terreno
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Nuestro equipo de ingenieros eléctricos y especialistas en automatización responderá
              con una propuesta técnico-económica detallada, alcance normativo RIC/SEC y arquitectura
              de telemetría recomendada.
            </p>

            <div className="space-y-3 pt-3 text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <PhoneCall className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Mesa Central Ingeniería: +56 2 2940 8800</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>proyectos@redvolt.cl • telemetria@redvolt.cl</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Av. Apoquindo 4700, Piso 11, Las Condes / Concepción / Antofagasta</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form
              id="form-cotizacion-tecnica"
              onSubmit={handleQuoteSubmit}
              className="bg-[#1E293B] border border-slate-700/80 rounded-xl p-6 sm:p-8 space-y-5 shadow-xl"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                    Empresa / Institución *
                  </label>
                  <input
                    id="quote-company"
                    type="text"
                    required
                    placeholder="Ej. Hospital Clínico del Sur / Minera Andes"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                    RUT Empresa (Opcional)
                  </label>
                  <input
                    id="quote-rut"
                    type="text"
                    placeholder="Ej. 76.543.210-K"
                    value={formData.rut}
                    onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                    Nombre Contacto Técnico *
                  </label>
                  <input
                    id="quote-contact"
                    type="text"
                    required
                    placeholder="Ing. Jefe de Mantención"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                    Correo Corporativo *
                  </label>
                  <input
                    id="quote-email"
                    type="email"
                    required
                    placeholder="contacto@empresa.cl"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                    Teléfono Directo *
                  </label>
                  <input
                    id="quote-phone"
                    type="text"
                    required
                    placeholder="+56 9 8888 7777"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                    Especialidad Requerida *
                  </label>
                  <select
                    id="quote-service"
                    value={formData.serviceCategory}
                    onChange={(e) => setFormData({ ...formData, serviceCategory: e.target.value })}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Diseño y Certificación de Tableros (RIC/SEC)">
                      1. Diseño, Armado y Certificación de Tableros (RIC/SEC)
                    </option>
                    <option value="Automatización Industrial y PLCs (Siemens/Honeywell/Mitsubishi/Haiwell)">
                      2. Automatización Industrial y Programación de PLCs
                    </option>
                    <option value="Telemetría IIoT y Calidad de Energía en Tiempo Real">
                      3. Sistemas de Telemetría IIoT y Calidad de Energía
                    </option>
                    <option value="Mantenimiento Industrial, Diagnóstico y Retrofitting">
                      4. Mantenimiento Industrial, Diagnóstico y Retrofitting
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                    Tipo de Instalación
                  </label>
                  <select
                    id="quote-facility"
                    value={formData.facilityType}
                    onChange={(e) => setFormData({ ...formData, facilityType: e.target.value })}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Hospital / Clínica / Recinto Asistencial">
                      Hospital / Clínica / Recinto Asistencial
                    </option>
                    <option value="Subestación / Sala Eléctrica Industrial">
                      Subestación / Sala Eléctrica Industrial
                    </option>
                    <option value="Planta de Proceso / Estación de Bombeo">
                      Planta de Proceso / Estación de Bombeo
                    </option>
                    <option value="Data Center / Infraestructura Crítica">
                      Data Center / Infraestructura Crítica
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                  Especificaciones Técnicas del Requerimiento *
                </label>
                <textarea
                  id="quote-details"
                  rows={3}
                  required
                  placeholder="Indique potencia estimada (kVA), cantidad de tableros, marca de PLC existente o variables que requiere monitorear en tiempo real..."
                  value={formData.projectDetails}
                  onChange={(e) => setFormData({ ...formData, projectDetails: e.target.value })}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {quoteError && (
                <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-xs text-red-300">
                  {quoteError}
                </div>
              )}

              {quoteSuccess && (
                <div
                  id="quote-success-banner"
                  className="p-4 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 space-y-1"
                >
                  <div className="font-bold text-sm text-emerald-200">
                    ✓ Solicitud Técnica Registrada — Folio {quoteSuccess.folio}
                  </div>
                  <p>
                    Hemos registrado el requerimiento de <strong>{quoteSuccess.company}</strong> en
                    nuestro sistema de ingeniería. Un especialista de Redvolt se pondrá en contacto
                    dentro de las próximas 2 horas hábiles.
                  </p>
                </div>
              )}

              <button
                id="btn-submit-quote"
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-5 rounded-lg bg-[#F97316] hover:bg-orange-500 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                {submitting
                  ? "Procesando Solicitud Técnica..."
                  : "Enviar Solicitud de Cotización Técnica"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-10 px-4 sm:px-8 text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white">REDVOLT INGENIERÍA S.A.</span>
            <span>— Ingeniería Eléctrica, Automatización y Telemetría IIoT</span>
          </div>
          <div className="font-mono text-slate-500">
            Normativa RIC / SEC • PostgreSQL Time-Series • MQTT / REST IIoT
          </div>
        </div>
      </footer>
    </div>
  );
}
