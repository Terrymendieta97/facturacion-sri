import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";

/**
 * GET /api/v1/status
 * Verifica el estado de la conexión, ambiente del SRI, saldo y plan comercial
 */
export async function GET(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    if (!auth.authorized) {
      return auth.response;
    }
    const issuer = auth.issuer;

    const sysConfig = await db.systemConfig.findFirst();
    const pricePerInvoice = sysConfig?.pricePerInvoice ?? 0.10;

    const hasSignature = Boolean(issuer.firmaElectronica && issuer.codigoSri);
    const totalInvoices = await db.invoice.count({ where: { issuerId: issuer.id } });

    return NextResponse.json({
      success: true,
      service: "Lojafac Open API v1",
      status: "ONLINE",
      timestamp: new Date().toISOString(),
      emisor: {
        ruc: issuer.ruc,
        nombreEmpresa: issuer.nombreEmpresa,
        razonSocial: issuer.razonSocial,
        ambiente: issuer.ambiente === 2 ? "PRODUCCION" : "PRUEBAS",
        tipoAmbiente: issuer.ambiente,
        firmaConfigurada: hasSignature,
        establecimiento: issuer.establecimiento,
        puntoEmision: issuer.puntoEmision,
      },
      plan: {
        tipo: issuer.planType === "MONTHLY" ? "MENSUAL_ILIMITADO" : "PAGO_POR_FACTURA",
        saldoDisponible: issuer.balance,
        costoPorFactura: pricePerInvoice,
        facturasEmitidas: totalInvoices,
        vencimientoSuscripcion: issuer.planType === "MONTHLY" ? issuer.subscriptionEnds : null,
        estado: issuer.status,
      },
    });
  } catch (error: any) {
    console.error("GET /api/v1/status error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar el estado de la API.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
