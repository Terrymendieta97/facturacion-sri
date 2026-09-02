import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/issuer
 * Obtiene la configuración del emisor logueado (vía cabecera x-issuer-id) o el primero por defecto.
 */
export async function GET(request: Request) {
  try {
    const issuerIdStr = request.headers.get("x-issuer-id");
    let issuer = null;

    if (issuerIdStr && issuerIdStr !== "default" && issuerIdStr !== "null" && issuerIdStr !== "undefined") {
      issuer = await db.issuer.findUnique({
        where: { id: parseInt(issuerIdStr, 10) },
      });
    } else {
      issuer = await db.issuer.findFirst();
    }

    if (!issuer) {
      // Crear un perfil vacío predeterminado si no existe ninguno en absoluto
      issuer = await db.issuer.create({
        data: {
          ruc: "9999999999999",
          nombres: "CONFIGURAR",
          apellidos: "EMISOR",
          nombreEmpresa: "Empresa Demo",
          razonSocial: "Empresa Demo S.A.",
          direccion: "Av. Principal N123, Quito",
          email: "emisor@example.com",
          celular: "0999999999",
          establecimiento: "001",
          puntoEmision: "001",
          obligadoContabilidad: false,
          regimen: "REGIMEN GENERAL",
          ambiente: 1, // 1 = Pruebas
          password: "admin",
        },
      });
    }

    // --- AUTO-CURACIÓN DE SECUENCIALES FUERA DE SINCRO ---
    const lastInvoice = await db.invoice.findFirst({
      where: { 
        issuerId: issuer.id,
        estado: { in: ["AUTORIZADA", "RECIBIDA"] }
      },
      orderBy: { secuencial: "desc" },
    });

    let nextSecNum = parseInt(issuer.startSecuencial || "1", 10);
    if (lastInvoice) {
      const lastSecNum = parseInt(lastInvoice.secuencial, 10);
      nextSecNum = Math.max(lastSecNum + 1, nextSecNum);
    }
    const activeStartSecuencial = String(nextSecNum).padStart(9, "0");

    if (activeStartSecuencial !== issuer.startSecuencial) {
      await db.issuer.update({
        where: { id: issuer.id },
        data: { startSecuencial: activeStartSecuencial },
      });
      issuer.startSecuencial = activeStartSecuencial;
    }

    // No retornar datos confidenciales de la firma
    const safeIssuer = {
      ...issuer,
      codigoSri: issuer.codigoSri ? "****" : null,
      firmaElectronica: issuer.firmaElectronica ? "CARGADA" : null,
    };

    return NextResponse.json(safeIssuer);
  } catch (error: any) {
    console.error("GET /api/issuer error:", error);
    return NextResponse.json({ error: "Fallo al obtener la configuración del emisor." }, { status: 500 });
  }
}

/**
 * POST /api/issuer
 * Maneja las acciones de registro, inicio de sesión y gestión administrativa SaaS,
 * así como la actualización estándar de configuraciones del emisor.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    const issuerIdHeader = request.headers.get("x-issuer-id");

    // --- ACCIÓN: REGISTRO PÚBLICO ---
    if (action === "register") {
      const {
        ruc,
        nombres,
        apellidos,
        nombreEmpresa,
        razonSocial,
        direccion,
        email,
        celular,
        password,
      } = body;

      if (!ruc || !nombres || !apellidos || !nombreEmpresa || !razonSocial || !direccion || !email || !password) {
        return NextResponse.json({ error: "Faltan campos obligatorios para el registro de la empresa." }, { status: 400 });
      }

      // Verificar si el RUC ya existe
      const existing = await db.issuer.findUnique({ where: { ruc } });
      if (existing) {
        return NextResponse.json({ error: "Este número de RUC ya se encuentra registrado." }, { status: 400 });
      }

      // Obtener saldo de regalo por defecto del SystemConfig
      let sysConfig = await db.systemConfig.findFirst();
      if (!sysConfig) {
        sysConfig = await db.systemConfig.create({
          data: {
            adminPassword: "1104759574.1998",
            adminWhatsapp: "593999999999",
            bankAccounts: "Banco Pichincha - Ahorros: 2200123456 (Beneficiario: FácilSRI)",
            defaultBalance: 5.0,
          },
        });
      }

      // El plan por defecto inicia con 30 días de suscripción mensual activa
      const subscriptionEnds = new Date();
      subscriptionEnds.setDate(subscriptionEnds.getDate() + 30);

      const newIssuer = await db.issuer.create({
        data: {
          ruc,
          nombres,
          apellidos,
          nombreEmpresa,
          razonSocial,
          direccion,
          email,
          celular,
          password,
          status: "ACTIVE",
          planType: "MONTHLY",
          monthlyFee: 15.0,
          balance: sysConfig.defaultBalance,
          subscriptionEnds,
          startSecuencial: "000000001",
        },
      });

      const safeIssuer = {
        ...newIssuer,
        password: "****",
      };

      return NextResponse.json({ success: true, issuer: safeIssuer });
    }

    // --- ACCIÓN: INICIO DE SESIÓN DE EMISOR (ACEPTA RUC O CORREO) ---
    if (action === "login") {
      const { ruc, email, identifier, password } = body;
      const input = (identifier || ruc || email || "").trim();

      if (!input || !password) {
        return NextResponse.json({ error: "Ingrese su RUC o Correo Electrónico y su contraseña." }, { status: 400 });
      }

      // Buscar por RUC o por Correo Electrónico en la base de datos
      const issuer = await db.issuer.findFirst({
        where: {
          OR: [
            { ruc: input },
            { email: { equals: input } },
          ],
        },
      });

      if (!issuer || issuer.password !== password) {
        return NextResponse.json({ error: "RUC / Correo Electrónico o contraseña incorrectos." }, { status: 400 });
      }

      const safeIssuer = {
        ...issuer,
        codigoSri: issuer.codigoSri ? "****" : null,
        firmaElectronica: issuer.firmaElectronica ? "CARGADA" : null,
        password: "****",
      };

      return NextResponse.json({ success: true, issuer: safeIssuer });
    }

    // --- ACCIÓN: LOGIN DE ADMINISTRADOR GENERAL ---
    if (action === "admin-login") {
      const { adminPassword } = body;
      const MASTER_PASSWORD = "1104759574.1998";
      let sysConfig = await db.systemConfig.findFirst();
      if (!sysConfig) {
        sysConfig = await db.systemConfig.create({
          data: {
            adminPassword: MASTER_PASSWORD,
            adminWhatsapp: "593999999999",
            bankAccounts: "Banco Pichincha - Ahorros: 2200123456 (Beneficiario: FácilSRI)",
            defaultBalance: 5.0,
          },
        });
      }

      const inputPass = (adminPassword || "").trim();
      const isValid = inputPass === MASTER_PASSWORD || (sysConfig && sysConfig.adminPassword === inputPass);

      if (!isValid) {
        return NextResponse.json({ error: "Contraseña de administrador incorrecta." }, { status: 401 });
      }

      // Auto-actualizar en la base de datos si la contraseña almacenada estaba desactualizada
      if (sysConfig && sysConfig.adminPassword !== MASTER_PASSWORD && inputPass === MASTER_PASSWORD) {
        try {
          await db.systemConfig.update({
            where: { id: sysConfig.id },
            data: { adminPassword: MASTER_PASSWORD },
          });
        } catch (updateErr) {
          console.error("Auto-sync adminPassword error:", updateErr);
        }
      }

      return NextResponse.json({ success: true, admin: true });
    }

    // --- ACCIÓN: LISTADO DE EMPRESAS (PARA ADMIN) ---
    if (action === "list") {
      const { adminPassword } = body;
      const MASTER_PASSWORD = "1104759574.1998";
      const sysConfig = await db.systemConfig.findFirst();
      const inputPass = (adminPassword || "").trim();
      const isValid = inputPass === MASTER_PASSWORD || (sysConfig && sysConfig.adminPassword === inputPass);

      if (!isValid) {
        return NextResponse.json({ error: "Acceso no autorizado para el listado administrativo." }, { status: 401 });
      }

      const companies = await db.issuer.findMany({
        orderBy: { createdAt: "desc" },
      });

      // Mapear de forma segura sin revelar contraseñas o firmas completas
      const safeCompanies = companies.map((c) => ({
        ...c,
        password: "****",
        firmaElectronica: c.firmaElectronica ? "CARGADA" : null,
      }));

      return NextResponse.json({ success: true, companies: safeCompanies });
    }

    // --- ACCIÓN: ACTUALIZAR CONFIGURACIÓN DE MEMBRESÍA (PARA ADMIN) ---
    if (action === "update-status") {
      const {
        adminPassword,
        targetIssuerId,
        status,
        planType,
        monthlyFee,
        balanceChange, // Saldo a sumar o restar (positivo o negativo)
        subscriptionEnds,
      } = body;

      const MASTER_PASSWORD = "1104759574.1998";
      const sysConfig = await db.systemConfig.findFirst();
      const inputPass = (adminPassword || "").trim();
      const isValid = inputPass === MASTER_PASSWORD || (sysConfig && sysConfig.adminPassword === inputPass);

      if (!isValid) {
        return NextResponse.json({ error: "Acceso no autorizado." }, { status: 401 });
      }

      if (!targetIssuerId) {
        return NextResponse.json({ error: "Se requiere el targetIssuerId." }, { status: 400 });
      }

      const targetIssuer = await db.issuer.findUnique({
        where: { id: parseInt(targetIssuerId, 10) },
      });

      if (!targetIssuer) {
        return NextResponse.json({ error: "La empresa objetivo no existe." }, { status: 404 });
      }

      const updatedData: any = {};
      if (status) updatedData.status = status;
      if (planType) updatedData.planType = planType;
      if (monthlyFee !== undefined) updatedData.monthlyFee = parseFloat(monthlyFee);
      if (subscriptionEnds) updatedData.subscriptionEnds = new Date(subscriptionEnds);

      if (balanceChange !== undefined && balanceChange !== 0) {
        updatedData.balance = targetIssuer.balance + parseFloat(balanceChange);
      }

      const updated = await db.issuer.update({
        where: { id: targetIssuer.id },
        data: updatedData,
      });

      return NextResponse.json({ success: true, company: { ...updated, password: "****" } });
    }

    // --- ACCIÓN EMISOR: CAMBIAR TIPO DE PLAN ---

    if (action === "switch-plan") {
      if (!issuerIdHeader || issuerIdHeader === "default" || issuerIdHeader === "null") {
        return NextResponse.json({ error: "Acceso no autorizado." }, { status: 401 });
      }

      const activeId = parseInt(issuerIdHeader, 10);
      const activeIssuer = await db.issuer.findUnique({ where: { id: activeId } });
      if (!activeIssuer) {
        return NextResponse.json({ error: "Emisor no encontrado." }, { status: 404 });
      }

      const newPlanType = activeIssuer.planType === "MONTHLY" ? "PAY_PER_INVOICE" : "MONTHLY";
      const updated = await db.issuer.update({
        where: { id: activeId },
        data: { planType: newPlanType },
      });

      return NextResponse.json({ success: true, issuer: { ...updated, password: "****", firmaElectronica: "CARGADA" } });
    }

    // --- ACCIÓN EMISOR: SIMULAR RECARGA INMEDIATA DE SALDO (PRUEBAS) ---
    if (action === "topup-balance") {
      const { monto } = body;
      if (!monto || parseFloat(monto) < 5.0) {
        return NextResponse.json({ error: "El monto mínimo de recarga es de $5.00." }, { status: 400 });
      }

      if (!issuerIdHeader || issuerIdHeader === "default" || issuerIdHeader === "null") {
        return NextResponse.json({ error: "Acceso no autorizado." }, { status: 401 });
      }

      const activeId = parseInt(issuerIdHeader, 10);
      const updated = await db.issuer.update({
        where: { id: activeId },
        data: {
          balance: {
            increment: parseFloat(monto),
          },
        },
      });

      return NextResponse.json({ success: true, issuer: { ...updated, password: "****", firmaElectronica: "CARGADA" } });
    }

    // --- ACCIÓN EMISOR: SIMULAR RENOVACIÓN MENSUAL (PRUEBAS) ---
    if (action === "renew-subscription") {
      if (!issuerIdHeader || issuerIdHeader === "default" || issuerIdHeader === "null") {
        return NextResponse.json({ error: "Acceso no autorizado." }, { status: 401 });
      }

      const activeId = parseInt(issuerIdHeader, 10);
      const activeIssuer = await db.issuer.findUnique({ where: { id: activeId } });
      if (!activeIssuer) {
        return NextResponse.json({ error: "Emisor no encontrado." }, { status: 404 });
      }

      const currentEnds = new Date(activeIssuer.subscriptionEnds);
      const baseDate = currentEnds > new Date() ? currentEnds : new Date();
      baseDate.setDate(baseDate.getDate() + 30);

      const updated = await db.issuer.update({
        where: { id: activeId },
        data: {
          subscriptionEnds: baseDate,
          status: "ACTIVE",
        },
      });

      return NextResponse.json({ success: true, issuer: { ...updated, password: "****", firmaElectronica: "CARGADA" } });
    }

    // --- FLUJO ESTÁNDAR: CREAR O ACTUALIZAR EMISOR LOGUEADO ---
    const {
      id,
      ruc,
      nombres,
      apellidos,
      nombreEmpresa,
      razonSocial,
      direccion,
      email,
      celular,
      establecimiento,
      puntoEmision,
      obligadoContabilidad,
      regimen,
      ambiente,
      firmaElectronica, // Base64
      codigoSri, // Contraseña
      startSecuencial,
      logo, // Base64 del logotipo
    } = body;

    if (!ruc || !nombres || !apellidos || !nombreEmpresa || !razonSocial || !direccion || !email) {
      return NextResponse.json({ error: "Faltan campos obligatorios para guardar el perfil del emisor." }, { status: 400 });
    }

    const dataToSave: any = {
      ruc,
      nombres,
      apellidos,
      nombreEmpresa,
      razonSocial,
      direccion,
      email,
      celular,
      establecimiento: establecimiento || "001",
      puntoEmision: puntoEmision || "001",
      obligadoContabilidad: !!obligadoContabilidad,
      regimen: regimen || "REGIMEN GENERAL",
      ambiente: parseInt(ambiente || "1", 10),
      startSecuencial: startSecuencial || "000000001",
    };

    // Solo actualizar firma, contraseña y logo si se cargaron de nuevo
    if (firmaElectronica && firmaElectronica !== "CARGADA") {
      dataToSave.firmaElectronica = firmaElectronica;
    }
    if (codigoSri && codigoSri !== "****") {
      dataToSave.codigoSri = codigoSri;
    }
    if (logo !== undefined) {
      dataToSave.logo = logo || null; // Guardar base64 o limpiar si es nulo
    }

    let savedIssuer;

    // Determinar qué id de emisor actualizar
    let activeId = id ? parseInt(id, 10) : null;
    if (!activeId && issuerIdHeader && issuerIdHeader !== "default" && issuerIdHeader !== "null" && issuerIdHeader !== "undefined") {
      activeId = parseInt(issuerIdHeader, 10);
    }

    if (activeId) {
      savedIssuer = await db.issuer.update({
        where: { id: activeId },
        data: dataToSave,
      });
    } else {
      // Si no hay id, buscar el primer registro o crear uno nuevo
      const existing = await db.issuer.findFirst();
      if (existing) {
        savedIssuer = await db.issuer.update({
          where: { id: existing.id },
          data: dataToSave,
        });
      } else {
        savedIssuer = await db.issuer.create({
          data: dataToSave,
        });
      }
    }

    const safeIssuer = {
      ...savedIssuer,
      codigoSri: savedIssuer.codigoSri ? "****" : null,
      firmaElectronica: savedIssuer.firmaElectronica ? "CARGADA" : null,
      password: "****",
    };

    return NextResponse.json({ success: true, issuer: safeIssuer });
  } catch (error: any) {
    console.error("POST /api/issuer error:", error);
    return NextResponse.json({ error: `Fallo al guardar la configuración: ${error.message || error}` }, { status: 500 });
  }
}
