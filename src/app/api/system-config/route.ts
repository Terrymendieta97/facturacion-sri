import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/system-config
 * Obtiene la configuración general del sistema SaaS (o la crea si no existe)
 */
export async function GET() {
  try {
    let config = await db.systemConfig.findFirst();

    if (!config) {
      config = await db.systemConfig.create({
        data: {
          adminPassword: "admin1234",
          adminWhatsapp: "593999999999",
          bankAccounts: "Banco Pichincha - Ahorros: 2200123456 (Beneficiario: FácilSRI)\nBanco Guayaquil - Corriente: 10293847 (Beneficiario: FácilSRI)",
          defaultBalance: 5.0,
        },
      });
    }

    // No devolvemos la contraseña del administrador en el GET público para mayor seguridad
    const safeConfig = {
      id: config.id,
      adminWhatsapp: config.adminWhatsapp,
      bankAccounts: config.bankAccounts,
      defaultBalance: config.defaultBalance,
      systemName: config.systemName,
      systemLogo: config.systemLogo,
      loginTitle: config.loginTitle,
      loginSubtitle: config.loginSubtitle,
    };

    return NextResponse.json(safeConfig);
  } catch (error: any) {
    console.error("GET /api/system-config error:", error);
    return NextResponse.json({ error: "Fallo al obtener la configuración general." }, { status: 500 });
  }
}

/**
 * POST /api/system-config
 * Actualiza la configuración general del sistema (requiere verificar la contraseña del administrador)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      adminPassword,
      newAdminPassword,
      adminWhatsapp,
      bankAccounts,
      defaultBalance,
      systemName,
      systemLogo,
      loginTitle,
      loginSubtitle,
    } = body;

    // Verificar contraseña actual para permitir cambios
    const config = await db.systemConfig.findFirst();
    const currentPassword = config ? config.adminPassword : "admin1234";

    if (adminPassword !== currentPassword) {
      return NextResponse.json({ error: "Contraseña de administrador incorrecta." }, { status: 401 });
    }

    const dataToSave: any = {
      adminWhatsapp: adminWhatsapp || "593999999999",
      bankAccounts: bankAccounts || "",
      defaultBalance: parseFloat(defaultBalance) >= 0 ? parseFloat(defaultBalance) : 5.0,
    };

    if (systemName !== undefined) dataToSave.systemName = systemName;
    if (systemLogo !== undefined) dataToSave.systemLogo = systemLogo;
    if (loginTitle !== undefined) dataToSave.loginTitle = loginTitle;
    if (loginSubtitle !== undefined) dataToSave.loginSubtitle = loginSubtitle;

    if (newAdminPassword) {
      dataToSave.adminPassword = newAdminPassword;
    }

    let savedConfig;
    if (config) {
      savedConfig = await db.systemConfig.update({
        where: { id: config.id },
        data: dataToSave,
      });
    } else {
      savedConfig = await db.systemConfig.create({
        data: {
          adminPassword: newAdminPassword || "admin1234",
          ...dataToSave,
        },
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        id: savedConfig.id,
        adminWhatsapp: savedConfig.adminWhatsapp,
        bankAccounts: savedConfig.bankAccounts,
        defaultBalance: savedConfig.defaultBalance,
        systemName: savedConfig.systemName,
        systemLogo: savedConfig.systemLogo,
        loginTitle: savedConfig.loginTitle,
        loginSubtitle: savedConfig.loginSubtitle,
      },
    });
  } catch (error: any) {
    console.error("POST /api/system-config error:", error);
    return NextResponse.json({ error: `Fallo al guardar la configuración: ${error.message || error}` }, { status: 500 });
  }
}
