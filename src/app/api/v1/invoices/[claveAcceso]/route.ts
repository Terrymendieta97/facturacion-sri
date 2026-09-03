import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

/**
 * GET /api/v1/invoices/[claveAcceso]
 * Consulta el estado y detalle de una factura emitida por su Clave de Acceso
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ claveAcceso: string }> }
) {
  try {
    const auth = await authenticateApiKey(request);
    if (!auth.authorized) {
      return auth.response;
    }
    const issuer = auth.issuer;

    const { claveAcceso } = await params;
    if (!claveAcceso || claveAcceso.length !== 49) {
      return NextResponse.json(
        { success: false, error: "Clave de acceso inválida. Debe tener 49 dígitos.", code: "INVALID_ACCESS_KEY" },
        { status: 400 }
      );
    }

    const invoice = await db.invoice.findFirst({
      where: {
        claveAcceso,
        issuerId: issuer.id,
      },
      include: {
        client: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Factura no encontrada para este emisor.", code: "INVOICE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const urlObj = new URL(request.url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const rideUrl = `${baseUrl}/api/invoices/download-pdf?claveAcceso=${claveAcceso}`;
    const xmlUrl = `${baseUrl}/api/invoices/download-xml?claveAcceso=${claveAcceso}`;

    return NextResponse.json({
      success: true,
      id: invoice.id,
      estado: invoice.estado,
      secuencial: `${issuer.establecimiento}-${issuer.puntoEmision}-${invoice.secuencial}`,
      claveAcceso: invoice.claveAcceso,
      fechaEmision: invoice.fechaEmision.toISOString(),
      totales: {
        subtotal0: invoice.subtotal0,
        subtotalIva: invoice.subtotalIva,
        valorIva: invoice.valorIva,
        total: invoice.total,
      },
      documentos: {
        rideUrl,
        xmlUrl,
      },
      cliente: {
        identificacion: invoice.client.identificacion,
        nombres: invoice.client.nombres,
        mail: invoice.client.mail,
        direccion: invoice.client.direccion,
      },
      items: invoice.items.map((it) => ({
        codigo: it.product?.codigoPrincipal || "N/A",
        nombre: it.product?.nombre || "N/A",
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        descuento: it.descuento,
        total: it.total,
      })),
      observaciones: invoice.observaciones,
    });
  } catch (error: any) {
    console.error("GET /api/v1/invoices/[claveAcceso] error:", error);
    return NextResponse.json(
      { success: false, error: "Fallo al consultar la factura.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
