import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function runSeed() {
  console.log("⚡ Inicializando datos maestros de Redvolt SCADA/IIoT...");

  await prisma.telemetryReading.deleteMany({});
  await prisma.alarmEvent.deleteMany({});
  await prisma.maintenanceLog.deleteMany({});
  await prisma.technicalDocument.deleteMany({});
  await prisma.hourMeter.deleteMany({});
  await prisma.virtualVariable.deleteMany({});
  await prisma.sensorVariable.deleteMany({});
  await prisma.device.deleteMany({});
  await prisma.board.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  // 1. Clientes (Tenants)
  const hospitalTenant = await prisma.tenant.create({
    data: {
      id: "tenant-hospital-regional",
      name: "Hospital Clínico Regional",
      rut: "61.608.400-K",
      industry: "Salud Crítica & Infraestructura Hospitalaria",
      contactEmail: "operaciones@hospitalregional.cl",
      phone: "+56 41 272 4000",
      address: "Av. San Martín 1436, Concepción, Región del Biobío",
    },
  });

  const agroindustrialTenant = await prisma.tenant.create({
    data: {
      id: "tenant-planta-andes",
      name: "Compañía Minera & Procesos del Pacífico S.A.",
      rut: "76.419.820-3",
      industry: "Minería, Bombeo de Alta Presión & Procesos",
      contactEmail: "mantenimiento.electrico@minerapacifico.cl",
      phone: "+56 2 2890 5500",
      address: "Km 28 Ruta Industrial Norte, Antofagasta",
    },
  });

  // 2. Usuarios con RBAC
  await prisma.user.createMany({
    data: [
      {
        id: "user-admin-redvolt",
        email: "admin@redvolt.cl",
        passwordHash: "Redvolt2026!",
        fullName: "Ing. Cristóbal Valdés M.",
        jobTitle: "Ingeniero Jefe Automatización & SCADA — Redvolt",
        role: "SUPER_ADMIN",
        tenantId: null,
      },
      {
        id: "user-hospital-client",
        email: "operaciones@hospitalregional.cl",
        passwordHash: "Hospital2026!",
        fullName: "Ing. Roberto Arancibia S.",
        jobTitle: "Jefe Unidad de Ingeniería Clínica y Electromedicina",
        role: "CLIENT",
        tenantId: hospitalTenant.id,
      },
      {
        id: "user-minera-client",
        email: "mantenimiento.electrico@minerapacifico.cl",
        passwordHash: "Minera2026!",
        fullName: "Ing. Daniela Pizarro H.",
        jobTitle: "Superintendente de Confiabilidad Eléctrica",
        role: "CLIENT",
        tenantId: agroindustrialTenant.id,
      },
    ],
  });

  // 3. Proyectos / Instalaciones
  const projQuirofanos = await prisma.project.create({
    data: {
      id: "proj-edificio-quirofanos",
      tenantId: hospitalTenant.id,
      name: "Edificio Quirófanos",
      code: "INST-HCR-QUIR",
      location: "Torre Crítica Piso -1 / Sala Eléctrica Quirófanos",
      description:
        "Red de distribución ininterrumpida y transferencia automática para 12 pabellones quirúrgicos y UCI cardiovascular.",
    },
  });

  const projSubestacionHosp = await prisma.project.create({
    data: {
      id: "proj-subestacion-hospital",
      tenantId: hospitalTenant.id,
      name: "Subestación Principal",
      code: "INST-HCR-SE01",
      location: "Patio de Fuerza Central 15 kV / 0.4 kV",
      description:
        "Subestación unitaria 2x1500 kVA con respaldo de grupos electrógenos gemelos Cummins 1250 kVA en sincronismo.",
    },
  });

  const projPlantaBombeo = await prisma.project.create({
    data: {
      id: "proj-planta-bombeo",
      tenantId: agroindustrialTenant.id,
      name: "Estación de Bombeo e Impulsión N°4",
      code: "INST-CMP-EB04",
      location: "Cota 1.450 msnm — Sala de Celdas y VDF",
      description:
        "Sala eléctrica presurizada con variadores de frecuencia Mitsubishi FR-A800 y control de presión en lazo cerrado.",
    },
  });

  // 4. Tableros / Equipos
  const boardQuirofanos = await prisma.board.create({
    data: {
      id: "board-quirofanos-01",
      tenantId: hospitalTenant.id,
      projectId: projQuirofanos.id,
      name: "Tablero General Quirófanos",
      code: "TDF-QUIR-01",
      normative: "RIC N°02 / RIC N°11 Instalaciones en Hospitales / SEC",
      plcModel: "Siemens SIMATIC S7-1215C DC/DC/DC + Analizador SENTRON PAC3220",
      gatewayModel: "Gateway Industrial CBOX IIoT Edge (Modbus TCP -> MQTT/TLS)",
      operationalStatus: "OPERATIVO",
      gatewayStatus: "ONLINE",
      lastHeartbeat: new Date(),
      latencyMs: 14,
      energyAccumulatedKwh: 18426.8,
      tariffClpPerKwh: 152.0,
    },
  });

  const boardSubestacion = await prisma.board.create({
    data: {
      id: "board-tta-grupos-02",
      tenantId: hospitalTenant.id,
      projectId: projSubestacionHosp.id,
      name: "Tablero Transferencia Automática (TTA) Grupos 1 y 2",
      code: "TTA-SE01-G12",
      normative: "RIC N°02 / RIC N°08 Sistemas de Emergencia / SEC",
      plcModel: "Honeywell ControlEdge PLC + DeepSea DSE8610 MKII",
      gatewayModel: "Node-RED Industrial Box LTE/Ethernet",
      operationalStatus: "OPERATIVO",
      gatewayStatus: "ONLINE",
      lastHeartbeat: new Date(),
      latencyMs: 21,
      energyAccumulatedKwh: 54190.4,
      tariffClpPerKwh: 152.0,
    },
  });

  const boardBombeo = await prisma.board.create({
    data: {
      id: "board-ccm-bombeo-01",
      tenantId: agroindustrialTenant.id,
      projectId: projPlantaBombeo.id,
      name: "CCM Impulsión Hidráulica Alta Presión",
      code: "CCM-EB04-01",
      normative: "RIC N°02 / RIC N°07 Instalaciones Industriales / SEC",
      plcModel: "Mitsubishi MELSEC iQ-R + HMI GOT2000 + Haiwell Cloud SCADA",
      gatewayModel: "Gateway CBOX-M4 LoRaWAN / MQTT",
      operationalStatus: "OPERATIVO",
      gatewayStatus: "ONLINE",
      lastHeartbeat: new Date(),
      latencyMs: 29,
      energyAccumulatedKwh: 92840.2,
      tariffClpPerKwh: 138.0,
    },
  });

  // 5. Dispositivos Gateways y API Keys
  const devQuirofanos = await prisma.device.create({
    data: {
      id: "dev-cbox-quirofanos",
      boardId: boardQuirofanos.id,
      name: "CBOX-IIoT-QUIR01 (Analizador PAC3220 + S7-1200)",
      protocol: "MQTT + REST API",
      apiKey: "rv_live_quirofanos_key_99481a",
      mqttTopicPrefix: `${hospitalTenant.id}/${projQuirofanos.id}/${boardQuirofanos.id}/dev-cbox-quirofanos`,
      ipAddress: "10.24.10.45",
      firmware: "v4.8.2-industrial-lts",
    },
  });

  const devSubestacion = await prisma.device.create({
    data: {
      id: "dev-gw-tta02",
      boardId: boardSubestacion.id,
      name: "GW-HONEYWELL-TTA02",
      protocol: "MQTT + REST API",
      apiKey: "rv_live_subestacion_key_77210b",
      mqttTopicPrefix: `${hospitalTenant.id}/${projSubestacionHosp.id}/${boardSubestacion.id}/dev-gw-tta02`,
      ipAddress: "10.24.10.12",
      firmware: "v3.9.1-sec",
    },
  });

  const devBombeo = await prisma.device.create({
    data: {
      id: "dev-gw-bombeo01",
      boardId: boardBombeo.id,
      name: "CBOX-MITSUBISHI-EB04",
      protocol: "MQTT + REST API",
      apiKey: "rv_live_minera_key_55109c",
      mqttTopicPrefix: `${agroindustrialTenant.id}/${projPlantaBombeo.id}/${boardBombeo.id}/dev-gw-bombeo01`,
      ipAddress: "192.168.140.20",
      firmware: "v4.8.2-industrial-lts",
    },
  });

  // Helper para crear variables estándar por tablero
  async function createStandardVariables(
    boardId: string,
    deviceId: string,
    baseCurrent: number
  ) {
    await prisma.sensorVariable.createMany({
      data: [
        {
          boardId,
          deviceId,
          code: "V_L1",
          name: "Voltaje Fase L1-N",
          unit: "V",
          category: "Tensión",
          dataType: "ANALOG",
          minNormal: 215,
          warnLow: 210,
          warnHigh: 232,
          critLow: 202,
          critHigh: 240,
          currentValue: 221.4,
        },
        {
          boardId,
          deviceId,
          code: "V_L2",
          name: "Voltaje Fase L2-N",
          unit: "V",
          category: "Tensión",
          dataType: "ANALOG",
          minNormal: 215,
          warnLow: 210,
          warnHigh: 232,
          critLow: 202,
          critHigh: 240,
          currentValue: 219.8,
        },
        {
          boardId,
          deviceId,
          code: "V_L3",
          name: "Voltaje Fase L3-N",
          unit: "V",
          category: "Tensión",
          dataType: "ANALOG",
          minNormal: 215,
          warnLow: 210,
          warnHigh: 232,
          critLow: 202,
          critHigh: 240,
          currentValue: 222.6,
        },
        {
          boardId,
          deviceId,
          code: "I_L1",
          name: "Corriente Línea L1",
          unit: "A",
          category: "Corriente",
          dataType: "ANALOG",
          minNormal: 10,
          warnLow: 5,
          warnHigh: baseCurrent * 1.25,
          critLow: 0,
          critHigh: baseCurrent * 1.45,
          currentValue: baseCurrent,
        },
        {
          boardId,
          deviceId,
          code: "I_L2",
          name: "Corriente Línea L2",
          unit: "A",
          category: "Corriente",
          dataType: "ANALOG",
          minNormal: 10,
          warnLow: 5,
          warnHigh: baseCurrent * 1.25,
          critLow: 0,
          critHigh: baseCurrent * 1.45,
          currentValue: +(baseCurrent * 0.96).toFixed(1),
        },
        {
          boardId,
          deviceId,
          code: "I_L3",
          name: "Corriente Línea L3",
          unit: "A",
          category: "Corriente",
          dataType: "ANALOG",
          minNormal: 10,
          warnLow: 5,
          warnHigh: baseCurrent * 1.25,
          critLow: 0,
          critHigh: baseCurrent * 1.45,
          currentValue: +(baseCurrent * 1.03).toFixed(1),
        },
        {
          boardId,
          deviceId,
          code: "FREQ",
          name: "Frecuencia de Red",
          unit: "Hz",
          category: "Calidad de Energía",
          dataType: "ANALOG",
          minNormal: 49.8,
          warnLow: 49.5,
          warnHigh: 50.5,
          critLow: 49.0,
          critHigh: 51.0,
          currentValue: 50.01,
        },
        {
          boardId,
          deviceId,
          code: "PF",
          name: "Factor de Potencia (Cos φ)",
          unit: "pu",
          category: "Calidad de Energía",
          dataType: "ANALOG",
          minNormal: 0.93,
          warnLow: 0.9,
          warnHigh: 1.0,
          critLow: 0.85,
          critHigh: 1.0,
          currentValue: 0.96,
        },
        {
          boardId,
          deviceId,
          code: "TEMP_BARRAS",
          name: "Temperatura Barras Cobre",
          unit: "°C",
          category: "Térmico",
          dataType: "ANALOG",
          minNormal: 25,
          warnLow: 15,
          warnHigh: 58,
          critLow: 5,
          critHigh: 70,
          currentValue: 38.4,
        },
        {
          boardId,
          deviceId,
          code: "DI_MAIN_BREAKER",
          name: "Interruptor General (52G)",
          unit: "BOOL",
          category: "Estado Digital",
          dataType: "DIGITAL",
          currentValue: 1,
        },
        {
          boardId,
          deviceId,
          code: "DI_CONTACTOR_K1",
          name: "Contactor Barra Crítica (K1)",
          unit: "BOOL",
          category: "Estado Digital",
          dataType: "DIGITAL",
          currentValue: 1,
        },
        {
          boardId,
          deviceId,
          code: "DI_PHASE_FAULT",
          name: "Relé Falla de Fase / Asimetría (47)",
          unit: "BOOL",
          category: "Estado Digital",
          dataType: "DIGITAL",
          currentValue: 0,
        },
        {
          boardId,
          deviceId,
          code: "DI_GEN_ONLINE",
          name: "Grupo Electrógeno en Línea",
          unit: "BOOL",
          category: "Estado Digital",
          dataType: "DIGITAL",
          currentValue: 0,
        },
        {
          boardId,
          deviceId,
          code: "DI_AUTO_MODE",
          name: "Selector PLC Auto / Manual",
          unit: "BOOL",
          category: "Estado Digital",
          dataType: "DIGITAL",
          currentValue: 1,
        },
      ],
    });

    const sTotalKva = +(
      ((221.4 * baseCurrent +
        219.8 * baseCurrent * 0.96 +
        222.6 * baseCurrent * 1.03) /
        1000)
    ).toFixed(2);

    await prisma.virtualVariable.createMany({
      data: [
        {
          boardId,
          code: "S_TOTAL_KVA",
          name: "Potencia Aparente Trifásica (S)",
          formula: "(V_L1*I_L1 + V_L2*I_L2 + V_L3*I_L3) / 1000",
          unit: "kVA",
          description: "Suma vectorial de potencia aparente en las 3 fases de carga",
          currentValue: sTotalKva,
        },
        {
          boardId,
          code: "V_UNBALANCE_PCT",
          name: "Desbalance de Tensión (NEMA MG1)",
          formula: "MAX(|V_i - V_avg|) / V_avg * 100",
          unit: "%",
          description:
            "Porcentaje de desviación máxima entre tensión de fase y promedio trifásico (Límite RIC < 2.0%)",
          currentValue: 0.64,
        },
        {
          boardId,
          code: "ENERGY_KWH",
          name: "Energía Activa Acumulada",
          formula: "∫ (S_TOTAL_KVA * PF) dt",
          unit: "kWh",
          description: "Integración continua de potencia activa consumida por el tablero",
          currentValue: 18426.8,
        },
        {
          boardId,
          code: "COST_CLP",
          name: "Costo Operacional Acumulado",
          formula: "ENERGY_KWH * Tarifa_CLP_kWh",
          unit: "CLP",
          description: "Valorización económica del consumo eléctrico según pliego tarifario AT4.3",
          currentValue: Math.round(18426.8 * 152),
        },
      ],
    });
  }

  await createStandardVariables(boardQuirofanos.id, devQuirofanos.id, 64.5);
  await createStandardVariables(boardSubestacion.id, devSubestacion.id, 185.0);
  await createStandardVariables(boardBombeo.id, devBombeo.id, 240.0);

  // 6. Horómetros Virtuales y Mantenimiento Predictivo
  await prisma.hourMeter.createMany({
    data: [
      {
        boardId: boardQuirofanos.id,
        equipmentName: "Interruptor Motorizado Principal & Transformador Aislación Quirófanos",
        code: "HM-QUIR-01",
        accumulatedHours: 1850.4,
        maintenanceTargetHours: 2500.0,
        warningHoursThreshold: 2100.0,
        triggerVariableCode: "I_L1",
        triggerThreshold: 5.0,
        isRunning: true,
      },
      {
        boardId: boardQuirofanos.id,
        equipmentName: "Sistema UPS Online Doble Conversión 80 kVA + Banco Clínico",
        code: "HM-QUIR-UPS",
        accumulatedHours: 2345.8,
        maintenanceTargetHours: 2500.0,
        warningHoursThreshold: 2250.0,
        triggerVariableCode: "DI_MAIN_BREAKER",
        triggerThreshold: 0.5,
        isRunning: true,
      },
      {
        boardId: boardSubestacion.id,
        equipmentName: "Conmutador Motorizado Socomec ATyS p M 1600A",
        code: "HM-TTA-01",
        accumulatedHours: 1410.0,
        maintenanceTargetHours: 2000.0,
        warningHoursThreshold: 1750.0,
        triggerVariableCode: "I_L1",
        triggerThreshold: 10.0,
        isRunning: true,
      },
      {
        boardId: boardBombeo.id,
        equipmentName: "Bomba Multietapa N°1 + Variador Mitsubishi FR-A840 160kW",
        code: "HM-EB04-P1",
        accumulatedHours: 2415.2,
        maintenanceTargetHours: 2500.0,
        warningHoursThreshold: 2250.0,
        triggerVariableCode: "I_L1",
        triggerThreshold: 20.0,
        isRunning: true,
      },
    ],
  });

  // 7. Generación de serie histórica inicial (60 puntos en las últimas 2 horas para visualización inmediata rica)
  const now = Date.now();
  const historicalReadings: {
    tenantId: string;
    boardId: string;
    variableCode: string;
    value: number;
    timestamp: Date;
  }[] = [];

  for (let i = 60; i >= 0; i--) {
    const ts = new Date(now - i * 60 * 1000); // Cada 1 minuto hacia atrás
    const wave = Math.sin(i / 5);
    const v1 = +(221.0 + wave * 1.8 + (Math.random() - 0.5) * 0.9).toFixed(2);
    const v2 = +(219.6 - wave * 1.4 + (Math.random() - 0.5) * 0.9).toFixed(2);
    const v3 = +(222.4 + Math.cos(i / 6) * 1.6 + (Math.random() - 0.5) * 0.9).toFixed(2);
    const i1 = +(64.0 + wave * 6.5 + (Math.random() - 0.5) * 2.2).toFixed(2);
    const i2 = +(61.5 + wave * 5.8 + (Math.random() - 0.5) * 2.0).toFixed(2);
    const i3 = +(66.2 + wave * 6.9 + (Math.random() - 0.5) * 2.3).toFixed(2);
    const freq = +(50.0 + Math.sin(i / 8) * 0.06 + (Math.random() - 0.5) * 0.03).toFixed(2);
    const temp = +(38.0 + Math.sin(i / 12) * 2.1).toFixed(1);

    historicalReadings.push(
      { tenantId: hospitalTenant.id, boardId: boardQuirofanos.id, variableCode: "V_L1", value: v1, timestamp: ts },
      { tenantId: hospitalTenant.id, boardId: boardQuirofanos.id, variableCode: "V_L2", value: v2, timestamp: ts },
      { tenantId: hospitalTenant.id, boardId: boardQuirofanos.id, variableCode: "V_L3", value: v3, timestamp: ts },
      { tenantId: hospitalTenant.id, boardId: boardQuirofanos.id, variableCode: "I_L1", value: i1, timestamp: ts },
      { tenantId: hospitalTenant.id, boardId: boardQuirofanos.id, variableCode: "I_L2", value: i2, timestamp: ts },
      { tenantId: hospitalTenant.id, boardId: boardQuirofanos.id, variableCode: "I_L3", value: i3, timestamp: ts },
      { tenantId: hospitalTenant.id, boardId: boardQuirofanos.id, variableCode: "FREQ", value: freq, timestamp: ts },
      { tenantId: hospitalTenant.id, boardId: boardQuirofanos.id, variableCode: "TEMP_BARRAS", value: temp, timestamp: ts }
    );
  }

  await prisma.telemetryReading.createMany({ data: historicalReadings });

  // 8. Alarmas Activas e Históricas Iniciales
  await prisma.alarmEvent.createMany({
    data: [
      {
        tenantId: hospitalTenant.id,
        boardId: boardQuirofanos.id,
        variableCode: "V_L3",
        variableName: "Voltaje Fase L3-N",
        severity: "WARNING",
        message: "Sobretensión transitoria en Fase L3 durante prueba de transferencia con carga clínica",
        measuredValue: 234.2,
        thresholdValue: 232.0,
        unit: "V",
        status: "ACTIVE",
        triggeredAt: new Date(now - 18 * 60 * 1000),
      },
      {
        tenantId: hospitalTenant.id,
        boardId: boardQuirofanos.id,
        variableCode: "HM-QUIR-UPS",
        variableName: "Horómetro Sistema UPS Online 80 kVA",
        severity: "WARNING",
        message: "Alerta temprana O&M: Horómetro alcanzó 93.8% (2.345 / 2.500 hrs) para mantención preventiva",
        measuredValue: 2345.8,
        thresholdValue: 2250.0,
        unit: "hrs",
        status: "ACTIVE",
        triggeredAt: new Date(now - 45 * 60 * 1000),
      },
      {
        tenantId: hospitalTenant.id,
        boardId: boardQuirofanos.id,
        variableCode: "I_L1",
        variableName: "Corriente Línea L1",
        severity: "CRITICAL",
        message: "Punta de corriente en arranque de Chiller Quirófanos N°2 superó umbral de advertencia",
        measuredValue: 88.4,
        thresholdValue: 80.6,
        unit: "A",
        status: "ACKNOWLEDGED",
        triggeredAt: new Date(now - 4 * 3600 * 1000),
        ackedAt: new Date(now - 3.5 * 3600 * 1000),
        ackedByUserId: "user-hospital-client",
        ackedByName: "Ing. Roberto Arancibia S.",
      },
    ],
  });

  // 9. Documentación Técnica (Pasaporte Digital del Tablero - mínimo 2 documentos requeridos, creamos 3 fichas ricas)
  await prisma.technicalDocument.createMany({
    data: [
      {
        tenantId: hospitalTenant.id,
        boardId: boardQuirofanos.id,
        title: "Diagrama Unilineal As-Built y Coordinación de Protecciones TDF-QUIR-01 (Norma RIC N°02/N°11)",
        category: "UNILINEAL",
        code: "DOC-RV-QUIR-UNI-001",
        version: "Rev. 4.2 As-Built",
        fileSize: "2.4 MB",
        fileUrl: "/api/boards/board-quirofanos-01/documents/download?code=DOC-RV-QUIR-UNI-001",
        summary:
          "Esquema unilineal completo de barras 400V/230V, transformadores de aislación médica 10 kVA, selectividad amperimétrica de interruptores caja moldeada Siemens 3VA2 y monitoreo de aislación Bender.",
        uploadedBy: "Ing. Cristóbal Valdés M. (Redvolt)",
        uploadedAt: new Date(now - 14 * 86400 * 1000),
      },
      {
        tenantId: hospitalTenant.id,
        boardId: boardQuirofanos.id,
        title: "Planos de Control PLC Siemens S7-1215C, Red Modbus TCP y Certificado de Calibración PAC3220",
        category: "PLANO_CONTROL",
        code: "DOC-RV-QUIR-CTL-002",
        version: "Rev. 3.0",
        fileSize: "3.8 MB",
        fileUrl: "/api/boards/board-quirofanos-01/documents/download?code=DOC-RV-QUIR-CTL-002",
        summary:
          "Esquemas funcionales de control 24VDC, topología de red industrial Profinet/Modbus hacia Gateway CBOX IIoT, listado de materiales (BOM) e informe de contrastación metrológica del analizador SENTRON PAC3220.",
        uploadedBy: "Ing. Cristóbal Valdés M. (Redvolt)",
        uploadedAt: new Date(now - 7 * 86400 * 1000),
      },
      {
        tenantId: hospitalTenant.id,
        boardId: boardQuirofanos.id,
        title: "Informe de Inspección Termográfica Infrarroja y Calidad de Energía (RIC N°19 Puesta en Servicio)",
        category: "TERMOGRAFIA",
        code: "DOC-RV-QUIR-TER-003",
        version: "Rev. 1.1",
        fileSize: "4.1 MB",
        fileUrl: "/api/boards/board-quirofanos-01/documents/download?code=DOC-RV-QUIR-TER-003",
        summary:
          "Termografía bajo plena carga en juegos de barras L1-L2-L3 y bornes de salida hacia pabellones 1 al 12. Delta T máximo registrado: 6.2 °C (Criterio NETA: Normal).",
        uploadedBy: "Ing. Felipe Matamala R. (Redvolt O&M)",
        uploadedAt: new Date(now - 3 * 86400 * 1000),
      },
    ],
  });

  // 10. Bitácora de Mantenciones en Terreno (3 registros históricos precargados para Hospital Clínico Regional)
  await prisma.maintenanceLog.createMany({
    data: [
      {
        tenantId: hospitalTenant.id,
        boardId: boardQuirofanos.id,
        performedAt: new Date(now - 25 * 86400 * 1000),
        technicianName: "Ing. Cristóbal Valdés M. — Especialista Redvolt",
        maintenanceType: "CALIBRACION",
        details:
          "Calibración de analizador de red SENTRON PAC3220 con maleta patrón trifásica Fluke, verificación de relación de transformación en TC 250/5A Clase 0.5S y reapriete torquimétrico (28 Nm) de borneras de fuerza principales.",
      },
      {
        tenantId: hospitalTenant.id,
        boardId: boardQuirofanos.id,
        performedAt: new Date(now - 12 * 86400 * 1000),
        technicianName: "Téc. Sup. Mauricio Sepúlveda — Cuadrilla O&M Redvolt",
        maintenanceType: "PREVENTIVA",
        details:
          "Mantención preventiva programada 1.500 hrs: Aspirado dieléctrico de celdas, limpieza de contactos auxiliares en interruptor motorizado 52G, prueba de disparo de relé de falla de fase (47) e inspección termográfica sin puntos calientes.",
      },
      {
        tenantId: hospitalTenant.id,
        boardId: boardQuirofanos.id,
        performedAt: new Date(now - 2 * 86400 * 1000),
        technicianName: "Ing. Cristóbal Valdés M. — Especialista Redvolt",
        maintenanceType: "MODIFICACION_LOGICA",
        details:
          "Actualización de lógica en PLC Siemens S7-1215C (TIA Portal v18) para integrar watchdog por latencia MQTT en Gateway CBOX y ajuste de histéresis en alarma de sobretensión fase L3 según requerimiento de Ingeniería Clínica.",
      },
    ],
  });

  console.log("✅ Seed de Redvolt completado exitosamente.");
}

if (require.main === module) {
  runSeed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
