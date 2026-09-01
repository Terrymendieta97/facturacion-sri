import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/invoices/download-xml?id=...
 * Sirve el XML (autorizado o no firmado) de la factura como una descarga directa
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get("id");

    if (!idStr) {
      return new Response("Se requiere el ID de la factura.", { status: 400 });
    }

    const invoice = await db.invoice.findUnique({
      where: { id: parseInt(idStr, 10) },
      include: { issuer: true },
    });

    if (!invoice) {
      return new Response("La factura seleccionada no existe.", { status: 404 });
    }

    const xmlContent = invoice.xmlAutorizado || invoice.xmlNoFirmado;
    if (!xmlContent) {
      return new Response("La factura no tiene contenido XML disponible.", { status: 404 });
    }

    const invoiceNum = `${invoice.issuer.establecimiento}-${invoice.issuer.puntoEmision}-${invoice.secuencial}`;
    const filename = invoice.xmlAutorizado ? `Factura_${invoiceNum}_Autorizada.xml` : `Factura_${invoiceNum}_NoFirmada.xml`;

    return new Response(xmlContent, {
      headers: {
        "Content-Type": "text/xml;charset=utf-8",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/invoices/download-xml error:", error);
    return new Response("Error al descargar el XML.", { status: 500 });
  }
}
