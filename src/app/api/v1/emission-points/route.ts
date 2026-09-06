import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

/**
 * GET /api/v1/emission-points
 * Lista todos los puntos de emisión activos de la empresa autenticada vía API Key
 * junto con su siguiente secuencial disponible.
 */
export async function GET(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    if (!auth.authorized) {
      return auth.response;
    }
    const issuer = auth.issuer;

    // Obtener todos los puntos de emisión configurados
    const emissionPoints = await db.emissionPoint.findMany({
      where: {
        issuerId: issuer.id,
        activo: true,
      },
      orderBy: [
        { establecimiento: "asc" },
        { puntoEmision: "asc" },
      ],
    });

    // Calcular el siguiente secuencial para cada punto de emisión
    const results = await Promise.all(
      emissionPoints.map(async (ep) => {
        const lastInvoice = await db.invoice.findFirst({
          where: {
            issuerId: issuer.id,
            establecimiento: ep.establecimiento,
            puntoEmision: ep.puntoEmision,
          },
          orderBy: { secuencial: "desc" },
        });

        let nextSecNum = parseInt(ep.secuencialInicio || "1", 10);
        let ultimoSecuencialEmitido: string | null = null;

        if (lastInvoice) {
          ultimoSecuencialEmitido = lastInvoice.secuencial;
          const lastSecNum = parseInt(lastInvoice.secuencial, 10);
          nextSecNum = Math.max(lastSecNum + 1, nextSecNum);
        }

        const siguienteSecuencial = String(nextSecNum).padStart(9, "0");

        return {
          id: ep.id,
          establecimiento: ep.establecimiento,
          puntoEmision: ep.puntoEmision,
          nombre: ep.nombre,
          secuencialInicio: ep.secuencialInicio,
          ultimoSecuencialEmitido,
          siguienteSecuencial,
          activo: ep.activo,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: results,
      total: results.length,
    });
  } catch (error: any) {
    console.error("Error en GET /api/v1/emission-points:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor al consultar los puntos de emisión.",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
