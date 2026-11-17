"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Lock, ShieldCheck, Building2, UserCheck, ArrowLeft, KeyRound } from "lucide-react";

const DEMO_CREDENTIALS = [
  {
    id: "demo-hospital",
    roleLabel: "CLIENTE DEMO PRINCIPAL (Aislamiento Tenant)",
    institution: "Hospital Clínico Regional",
    user: "Ing. Roberto Arancibia S. — Jefe Ingeniería Clínica",
    email: "operaciones@hospitalregional.cl",
    password: "Hospital2026!",
    badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
    scope: "Acceso exclusivo a proyectos de Hospital Clínico Regional (Edificio Quirófanos y Subestación).",
  },
  {
    id: "demo-superadmin",
    roleLabel: "SUPER-ADMIN (Ingeniero Redvolt)",
    institution: "Redvolt Ingeniería Central (Multi-Tenant)",
    user: "Ing. Cristóbal Valdés M. — Jefe Automatización & SCADA",
    email: "admin@redvolt.cl",
    password: "Redvolt2026!",
    badgeColor: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    scope: "Control total CRUD de empresas clientes, proyectos, tableros, umbrales, planos y bitácoras.",
  },
  {
    id: "demo-minera",
    roleLabel: "CLIENTE DEMO SECUNDARIO (Prueba Multi-Tenant)",
    institution: "Compañía Minera & Procesos del Pacífico S.A.",
    user: "Ing. Daniela Pizarro H. — Superintendente Eléctrica",
    email: "mantenimiento.electrico@minerapacifico.cl",
    password: "Minera2026!",
    badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    scope: "Acceso aislado únicamente a Estación de Bombeo e Impulsión N°4 (sin acceso al Hospital).",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("operaciones@hospitalregional.cl");
  const [password, setPassword] = useState("Hospital2026!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        setLoading(false);
        return;
      }
      setLoading(false);
      router.push("/portal");
      router.refresh();
    } catch {
      setError("Error de red al autenticar con el servidor SCADA");
      setLoading(false);
    }
  }

  function applyDemoCredential(cred: (typeof DEMO_CREDENTIALS)[number]) {
    setEmail(cred.email);
    setPassword(cred.password);
    setError(null);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-6xl w-full mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Portal Corporativo Redvolt
        </Link>
      </div>

      <div className="max-w-6xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Formulario de Acceso */}
        <div className="lg:col-span-5 bg-[#1E293B] border border-slate-700/90 rounded-xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-lg bg-[#0F172A] border border-cyan-500/50 flex items-center justify-center">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight block">
                REDVOLT SCADA / IIoT
              </span>
              <span className="text-xs font-mono text-cyan-400">
                PORTAL DE TELEMETRÍA &amp; O&amp;M MULTI-TENANT
              </span>
            </div>
          </div>

          <h1 className="text-xl font-bold text-white mb-1">
            Autenticación de Operadores y Clientes
          </h1>
          <p className="text-xs text-slate-400 mb-6">
            Ingrese con sus credenciales corporativas o seleccione una cuenta de demostración a la
            derecha para probar el aislamiento por <code className="text-cyan-300">tenant_id</code>.
          </p>

          <form id="login-form" onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                Correo Electrónico Corporativo
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                Contraseña de Acceso
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            {error && (
              <div
                id="login-error"
                className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-xs text-red-300"
              >
                {error}
              </div>
            )}

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>
                {loading ? "Verificando Permisos RBAC..." : "Iniciar Sesión en Consola SCADA"}
              </span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Cifrado HMAC-SHA256</span>
            <span>RBAC Multi-Tenant Activo</span>
          </div>
        </div>

        {/* Columna Derecha: Credenciales de Demostración Visibles */}
        <div className="lg:col-span-7 bg-[#1E293B]/80 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-orange-400 block">
                CREDENCIALES DE DEMOSTRACIÓN PRECARGADAS
              </span>
              <h2 className="text-lg font-bold text-white">
                Pruebe el Control de Acceso Basado en Roles (RBAC)
              </h2>
            </div>
            <KeyRound className="w-6 h-6 text-cyan-400 shrink-0" />
          </div>

          <div className="space-y-4">
            {DEMO_CREDENTIALS.map((cred) => {
              const isSelected = email === cred.email;
              return (
                <div
                  key={cred.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-[#0F172A] border-cyan-500/70 shadow-lg"
                      : "bg-[#0F172A]/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded border ${cred.badgeColor}`}
                    >
                      {cred.roleLabel}
                    </span>
                    <button
                      id={`btn-select-${cred.id}`}
                      type="button"
                      onClick={() => applyDemoCredential(cred)}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
                    >
                      {isSelected ? "✓ Credencial Cargada" : "Cargar Credenciales"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{cred.institution}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cred.user}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/90 border border-slate-800/90 rounded-lg p-2.5 text-xs font-mono">
                    <div>
                      <span className="text-slate-500">Usuario: </span>
                      <span className="text-cyan-300">{cred.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Clave: </span>
                      <span className="text-orange-300">{cred.password}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2">{cred.scope}</p>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Simulador en Tiempo Real Activo:</strong> El tablero{" "}
              <span className="text-cyan-300 font-mono">
                Hospital Clínico Regional — Tablero General Quirófanos (TDF-QUIR-01)
              </span>{" "}
              recibe inyección de telemetría trifásica cada <strong>3 segundos</strong> con
              horómetros avanzando, 3 bitácoras en terreno y documentos técnicos precargados.
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl w-full mx-auto text-center text-xs font-mono text-slate-500">
        Redvolt Ingeniería S.A. — Plataforma SCADA/IIoT Multi-Tenant con Aislamiento PostgreSQL
      </div>
    </div>
  );
}
